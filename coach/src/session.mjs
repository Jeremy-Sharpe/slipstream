export class Outbox {
  constructor(turns = [], actions = []) {
    this.turns = [...turns];
    this.actions = [...actions];
    this.cursor = 0;
  }
  append(turn) {
    if (
      this.turns.length >= 2000 ||
      this.turns.reduce((sum, t) => sum + t.text.length, 0) + turn.text.length > 400000
    )
      throw new Error("Call transcript limit reached");
    const entry = { ...turn, sequence: this.turns.length };
    this.turns.push(entry);
    return entry;
  }
  restore(serverTurns) {
    for (let i = 0; i < Math.min(this.turns.length, serverTurns.length); i++)
      if (JSON.stringify(this.turns[i]) !== JSON.stringify(serverTurns[i])) {
        // JSON field ordering is immaterial across Python and JavaScript.
        if (
          ["sequence", "role", "text", "start_ms", "end_ms"].some(
            (key) => this.turns[i][key] !== serverTurns[i][key],
          )
        )
          throw new Error(
            "Transcript differs from the saved session. End and review before continuing.",
          );
      }
    if (serverTurns.length > this.turns.length) this.turns = [...serverTurns];
    this.cursor = serverTurns.length;
  }
  acknowledge(sequence) {
    this.cursor = Math.max(this.cursor, sequence + 1);
  }
  pending() {
    return this.turns.slice(this.cursor);
  }
  action(action, suggestion_id) {
    const event = { type: "action", action_id: crypto.randomUUID(), action, suggestion_id };
    this.actions.push(event);
    return event;
  }
  ackAction(id) {
    this.actions = this.actions.filter((a) => a.action_id !== id);
  }
}
