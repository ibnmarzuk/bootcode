# QuizTerm website upgrade plan

## Product direction

QuizTerm is a fast, confidence-building live quiz studio for teachers, facilitators, trainers, and event hosts: upload a PDF, turn its content into a playable quiz, then put one scan-friendly join screen in front of the room.

## Design system

- **Design movement:** editorial control-room interface with soft neo-brutalist panels and live broadcast cues.
- **Core principles:** make the next action obvious; show live state honestly; prioritize the host's room workflow; keep participant actions frictionless.
- **Color philosophy:** midnight navy creates focus and contrast; mint green signals readiness and success; warm amber marks AI work and attention; coral is reserved for live urgency.
- **Layout paradigm:** an asymmetric command dashboard—large orientation hero and workflow cards on top, compact metrics beneath, then the active room and setup checklist.
- **Signature elements:** numbered workflow rail, scan-ready join callout, and small broadcast-status pills.
- **Interaction philosophy:** every primary action has a plain-language verb; status changes are visible immediately; QR/projector actions stay one click away from the active room.
- **Animation:** restrained pulse on live indicators, short lift on actionable cards, no decorative motion during live questions.
- **Typography:** Inter for readable product copy; JetBrains Mono for access codes, status labels, and telemetry.
- **Brand essence:** “From source material to live room, without the setup drag.” Personality: focused, welcoming, reliable.
- **Brand voice:** “Turn a PDF into a room.” and “Scan in. Play fair. See the result.”
- **Wordmark / mark:** a compact Q-shaped loop with a broadcast dot, paired with the QUIZTERM wordmark.
- **Signature brand color:** signal mint `#72F2B8`.

## Implementation

- Add an Overview tab as the default host landing surface.
- Keep the existing Questions & AI, Games & Events, Host Live Room, participant mode, projector QR, realtime controls, and Results & Export modules.
- The overview links directly to PDF upload/generation, active room hosting, participant preview, and projector mode.
- Declare the SPA root route in `public/manus-routes.json`.
