# reply_hackathon

Reply Student Tech Clash 2026 · AI on Campus

## Showwork

[Student room](https://solution-room-demo.onrender.com/join) · [Class projector](https://solution-room-demo.onrender.com/board) · [Run the demo](demo/README.md#run-an-open-question)

Showwork helps a university instructor see how a class approached an open question. Upload a photo or worksheet, review the exact question and private reference, and open it for the room. Students write their own response and see private feedback. The professor sees anonymous reasoning patterns as submissions arrive and can decide which step to explain next.

Run it with Node 22.16 or newer and `npm ci && npm start`. The terminal prints the private professor link. `npm run demo` opens the offline rehearsal. `npm test` checks the classroom API and `npm run test:model` exercises the local model. For server-side Luna analysis, set `OPENAI_API_KEY` on the host.

The [demo guide](demo/README.md) also describes the earlier worked-step notebook. [Original classroom proposal](ai-classroom-feedback-proposal.md) · [Idea discussion](DEBATE.md)
