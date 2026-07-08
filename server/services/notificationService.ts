export const notificationService = {
  async sendMeetingInvitation(roomCode: string, recipientEmails: string[]) {
    console.log(`[Notification Service] Dispatched meeting invitations for Room [${roomCode}]...`);
    
    // Simulate notification server processing latency
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const logs = recipientEmails.map((email) => {
      const logMsg = `[Notification Server] Sent email invite to: ${email} for session code: ${roomCode}`;
      console.log(logMsg);
      return logMsg;
    });

    return {
      success: true,
      sentCount: recipientEmails.length,
      logs
    };
  }
};
