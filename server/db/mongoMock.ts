// Mock MongoDB Document Store representing Meeting Database
export interface MongoMeetingDocument {
  _id: string;
  title: string;
  date: string;
  duration: number;
  points: string[];
  summary?: string;
  keyPoints?: string[];
  transcript?: string;
  languageHint?: string;
  actionItems?: Array<{ task: string; owner: string; deadline: string }>;
  localOnly?: boolean;
  recycled?: boolean;
}

// In-memory simulated MongoDB collections
const meetingsCollection: Map<string, MongoMeetingDocument> = new Map();

export const mongoMock = {
  async insertOne(doc: Omit<MongoMeetingDocument, "_id">): Promise<MongoMeetingDocument> {
    const id = Math.random().toString(36).substring(2, 15);
    const newDoc: MongoMeetingDocument = { ...doc, _id: id };
    console.log(`[MongoDB] db.meetings.insertOne({ title: "${newDoc.title}", date: "${newDoc.date}" })`);
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate write latency
    meetingsCollection.set(id, newDoc);
    return newDoc;
  },

  async findMany(query: Partial<MongoMeetingDocument> = {}): Promise<MongoMeetingDocument[]> {
    console.log(`[MongoDB] db.meetings.find(${JSON.stringify(query)})`);
    await new Promise(resolve => setTimeout(resolve, 80));
    let results = Array.from(meetingsCollection.values());
    
    // Apply basic filter matching
    if (query.recycled !== undefined) {
      results = results.filter(doc => !!doc.recycled === !!query.recycled);
    }
    return results;
  },

  async updateOne(id: string, update: Partial<MongoMeetingDocument>): Promise<boolean> {
    console.log(`[MongoDB] db.meetings.updateOne({ _id: "${id}" }, { $set: ${JSON.stringify(update)} })`);
    await new Promise(resolve => setTimeout(resolve, 100));
    const doc = meetingsCollection.get(id);
    if (!doc) return false;
    meetingsCollection.set(id, { ...doc, ...update });
    return true;
  },

  async deleteOne(id: string): Promise<boolean> {
    console.log(`[MongoDB] db.meetings.deleteOne({ _id: "${id}" })`);
    await new Promise(resolve => setTimeout(resolve, 120));
    return meetingsCollection.delete(id);
  }
};
