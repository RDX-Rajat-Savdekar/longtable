# Longtable

A friend group shares one weekly table. Plans sit on the days, the people in the room sit along the near edge, and a notepad holds the side conversation. The host stamps outdoor plans with the live weather and mails a short letter. The same table is still there after a reload.

Live URL: not deployed yet. DeepSpace sign-in is required before the app can register and deploy.

## Integrations

- `openweathermap/current` stamps every outdoor plan with the city's conditions. Rain, snow, and storms mark the plan "Leave it".
- `anthropic/chat-completion` (`claude-haiku-4-5`) writes the letter from the plans and the notepad.
- `email/send` mails that letter to the host.

All three are billed to the app owner and only run from signed-in server actions. A friend can set a plan and write a note. They cannot stamp, write, or send.

## The cut

One table for the whole deployment, not a directory of groups. Card text is a record, not a collaborative document. No calendar and no map. Those would add a second product beside the table.

## What the agent did

Scaffolded the DeepSpace app, named it Longtable, and built the table, the permissions, and the three actions. The weather and letter parsers were checked by running them: rain and storms count as rough weather, a clear sky does not, and the letter reader accepts an Anthropic `content[].text` body and a `response` string.

## What still needs a person

Sign in at the DeepSpace CLI page, then:

1. Open the table, set a plan from a second browser, and confirm it appears without a refresh.
2. Stamp an outdoor plan and read the weather line.
3. Write the letter and mail it. If `email/send` rejects `Longtable <letters@deep.space>`, put the allowed `from` address in `src/table/days.ts` (`LETTER_FROM`) and send once more.
4. Reload. The plans and the letter should still be there.
5. Record with `DEMO=1` once two test accounts exist and the older one is the app owner. The host clip is `output/clips/host-happy-path.webm`.

## Next

A second table would be another record room, `table:${id}`, with an invite link. That is the piece this version leaves out.
