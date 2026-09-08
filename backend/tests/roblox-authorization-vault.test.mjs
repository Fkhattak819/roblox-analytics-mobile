import test from 'node:test';
import assert from 'node:assert/strict';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { DynamoKmsRobloxAuthorizationVault } from '../dist/backend/src/modules/auth/roblox-authorization-vault.js';

const now = 1_800_000_000_000;
const authorization = (overrides = {}) => ({
  accessToken: 'roblox-access-token',
  refreshToken: 'roblox-refresh-token',
  accessExpiresAt: now + 15 * 60_000,
  refreshExpiresAt: now + 90 * 86400_000,
  universeIds: ['10009166512'],
  ...overrides,
});

test('delegated Roblox tokens are KMS encrypted and never written to DynamoDB plaintext', async () => {
  const dynamoCommands = [];
  const kmsCommands = [];
  const vault = new DynamoKmsRobloxAuthorizationVault(
    { send: async (command) => { dynamoCommands.push(command); return {}; } },
    { send: async (command) => {
      kmsCommands.push(command);
      assert.equal(command.constructor.name, 'EncryptCommand');
      assert.deepEqual(JSON.parse(Buffer.from(command.input.Plaintext).toString('utf8')), {
        accessToken: 'roblox-access-token', refreshToken: 'roblox-refresh-token',
      });
      assert.equal(command.input.EncryptionContext.purpose, 'roblox-delegated-oauth');
      return { CiphertextBlob: Uint8Array.from([1, 2, 3, 4]) };
    } },
    'test-table', 'test-kms-key', { getCredentials: async () => assert.fail('no refresh expected') },
    undefined, () => now,
  );

  await vault.saveAuthorization('123456', authorization());
  assert.equal(kmsCommands.length, 1);
  assert.equal(dynamoCommands.length, 1);
  const command = dynamoCommands[0];
  assert.equal(command.constructor.name, 'UpdateItemCommand');
  assert.equal(command.input.Key.PK.S.startsWith('AUTH#OAUTH#'), true);
  const values = unmarshall(command.input.ExpressionAttributeValues);
  assert.deepEqual(values[':tokens'], Uint8Array.from([1, 2, 3, 4]));
  assert.deepEqual(values[':universes'], ['10009166512']);
  assert.doesNotMatch(JSON.stringify(command.input), /roblox-access-token|roblox-refresh-token/);
});

test('worker refreshes an expiring delegated token with a single-use lease and stores the rotated grant', async () => {
  const ciphertext = Uint8Array.from([7, 8, 9]);
  const rotatedCiphertext = Uint8Array.from([10, 11, 12]);
  const dynamoCommands = [];
  const vault = new DynamoKmsRobloxAuthorizationVault(
    { send: async (command) => {
      dynamoCommands.push(command);
      if (command.constructor.name === 'GetItemCommand') {
        return { Item: marshall({ type: 'roblox-oauth-authorization', encryptedTokens: ciphertext,
          accessExpiresAt: now + 30_000, refreshExpiresAt: now + 86400_000,
          universeIds: ['10009166512'], version: 1 }) };
      }
      return {};
    } },
    { send: async (command) => {
      if (command.constructor.name === 'DecryptCommand') {
        return { Plaintext: Buffer.from(JSON.stringify({ accessToken: 'old-access', refreshToken: 'old-refresh' })) };
      }
      assert.equal(command.constructor.name, 'EncryptCommand');
      return { CiphertextBlob: rotatedCiphertext };
    } },
    'test-table', 'test-kms-key',
    { getCredentials: async () => ({ clientId: 'client', clientSecret: 'secret' }) },
    { refreshAuthorization: async ({ refreshToken }) => {
      assert.equal(refreshToken, 'old-refresh');
      return authorization({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    } },
    () => now,
  );

  assert.equal(await vault.getAccessToken('123456', '10009166512'), 'new-access');
  assert.deepEqual(dynamoCommands.map((command) => command.constructor.name), [
    'GetItemCommand', 'UpdateItemCommand', 'UpdateItemCommand',
  ]);
  assert.match(dynamoCommands[1].input.ConditionExpression, /refreshLeaseExpiresAt/);
  const completed = unmarshall(dynamoCommands[2].input.ExpressionAttributeValues);
  assert.deepEqual(completed[':tokens'], rotatedCiphertext);
  assert.deepEqual(completed[':universes'], ['10009166512']);
});
