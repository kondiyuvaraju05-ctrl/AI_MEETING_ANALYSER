import { mongoMock, MongoMeetingDocument } from "../db/mongoMock";

export const meetingService = {
  async saveMeetingRecord(record: Omit<MongoMeetingDocument, "_id">) {
    console.log(`[Meeting Service] Saving new meeting recap to MongoDB...`);
    const doc = await mongoMock.insertOne({
      ...record,
      recycled: false
    });
    return doc;
  },

  async getAllMeetings() {
    console.log(`[Meeting Service] Fetching saved meeting lists...`);
    return await mongoMock.findMany({ recycled: false });
  },

  async getRecycledMeetings() {
    console.log(`[Meeting Service] Fetching deleted recycle bin items...`);
    return await mongoMock.findMany({ recycled: true });
  },

  async moveMeetingToBin(id: string) {
    console.log(`[Meeting Service] Moving meeting ${id} to recycle bin...`);
    return await mongoMock.updateOne(id, { recycled: true });
  },

  async restoreMeetingFromBin(id: string) {
    console.log(`[Meeting Service] Restoring meeting ${id} from recycle bin...`);
    return await mongoMock.updateOne(id, { recycled: false });
  },

  async deleteMeetingPermanently(id: string) {
    console.log(`[Meeting Service] Deleting meeting ${id} permanently...`);
    return await mongoMock.deleteOne(id);
  }
};
