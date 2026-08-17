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
  actionItems?: Array<{ task: string; owner: string; deadline: string; completed?: boolean }>;
  localOnly?: boolean;
  recycled?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  category?: "Engineering" | "Marketing" | "Infrastructure" | "Sales" | "General";
  emailDraft?: string;
  manualEntryText?: string;
}

// In-memory simulated MongoDB collection with initial seed items
const meetingsCollection: Map<string, MongoMeetingDocument> = new Map([
  [
    "seed-1",
    {
      _id: "seed-1",
      title: "Engineering Architecture & Container Sprint",
      date: "Monday, August 3, 2026 at 10:00 AM",
      duration: 360,
      category: "Engineering",
      points: [
        "Sarah led discussion on Express backend and container deployment.",
        "Marcus finalized PostgreSQL relational schema and indexing for fast search.",
        "Elena integrated Gemini 3.5 Flash for low-latency audio summarization."
      ],
      summary: "Engineering team aligned on containerization strategy, relational database indexing, and server-side Gemini 3.5 Flash integration for fast meeting processing.",
      keyPoints: [
        "Express backend ready for container deployment.",
        "PostgreSQL schemas and search indexes ready.",
        "Gemini 3.5 Flash deployed for audio transcription."
      ],
      transcript: "Sarah: Let's discuss our Sprint 1 engineering tasks. Marcus, how are the DB schemas coming?\nMarcus: The relational schemas and GIN indexes for search are ready.\nElena: Perfect, Gemini audio transcription pipeline is live.",
      languageHint: "English",
      actionItems: [
        { task: "Deploy container container image to staging", owner: "Sarah", deadline: "Friday EOD", completed: true },
        { task: "Run DB index performance test", owner: "Marcus", deadline: "Next Monday", completed: false }
      ],
      emailDraft: "Hi Team,\n\nHere is a quick recap of our Engineering Architecture meeting:\n- Container deployment strategy finalized.\n- DB schema & GIN indexes ready.\n- Gemini audio transcription live.\n\nNext steps:\n- Sarah: Deploy container image\n- Marcus: Run DB index performance tests\n\nBest regards,\nAI Meeting Assistant",
      recycled: false,
      isDeleted: false
    }
  ],
  [
    "seed-2",
    {
      _id: "seed-2",
      title: "Q3 Marketing Campaign & Launch Plan",
      date: "Thursday, August 6, 2026 at 02:15 PM",
      duration: 210,
      category: "Marketing",
      points: [
        "Alex presented the Q3 video campaign roadmap and product landing page redesign.",
        "David highlighted competitive positioning for the AI Assistant platform."
      ],
      summary: "Marketing sync focused on Q3 video marketing campaigns, social media assets, and positioning the platform's unique manual entry and 11-language translation capabilities.",
      keyPoints: [
        "Q3 product launch scheduled for late August.",
        "Landing page design approved.",
        "Highlight 11-language translation engine in marketing materials."
      ],
      transcript: "Alex: We are launching our Q3 video ads next week. David, have you reviewed the landing copy?\nDavid: Yes, the focus on manual notes fallback and translation is spot-on.",
      languageHint: "English",
      actionItems: [
        { task: "Finalize social media copy", owner: "Alex", deadline: "Wednesday", completed: false }
      ],
      emailDraft: "Hi Marketing Team,\n\nSummary of today's sync:\n- Q3 launch on schedule.\n- Landing page highlighting multi-language capabilities approved.\n\nBest regards,\nAI Meeting Assistant",
      recycled: false,
      isDeleted: false
    }
  ]
]);

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
    if (query.isDeleted !== undefined) {
      results = results.filter(doc => !!doc.isDeleted === !!query.isDeleted);
    }
    if (query.category) {
      results = results.filter(doc => doc.category === query.category);
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
