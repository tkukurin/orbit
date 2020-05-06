import shimFirebasePersistence from "firebase-node-persistence-shim";
import { PromptID } from "metabook-core";
import { testBasicPrompt } from "metabook-sample-data";
import DataRecordStore from "./dataRecordStore";

beforeAll(() => {
  shimFirebasePersistence();
});

let cache: DataRecordStore;
beforeEach(() => {
  cache = new DataRecordStore(`test-${Date.now()}`);
});

afterEach(async () => {
  await cache.clear();
  await cache.close();
});

test("round trips data", async () => {
  const saveResult = await cache.savePrompt("x" as PromptID, testBasicPrompt);
  expect(saveResult).not.toBeInstanceOf(Error);
  const record = await cache.getPrompt("x" as PromptID);
  expect(record).toMatchObject(testBasicPrompt);
});

test("returns null for missing keys", async () => {
  const record = await cache.getPrompt("foo" as PromptID);
  expect(record).toBeNull();
});