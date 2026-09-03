# notInteresting

One click to tell LinkedIn and X you're not interested in a post.

## The pain

Both sites let you say "not interested" — and both bury it. Open the `···` menu, move
the mouse, find the row, click it. Three actions for one intent, so nobody bothers,
so the feed never learns what you don't want to see.

## What it does

Puts a single button in the post header, right next to the `···`. Clicking it runs the
site's own "Not interested" action — same result, same undo, no menu.

- **LinkedIn** — a thumbs-down between the `···` and the `✕`
- **X** — a frowning face between the Grok icon and the `···`

Nothing is sent anywhere: no permissions, no network calls, no storage. The button just
does what you'd have done by hand.

## Install

1. Download this repo (green **Code** button → *Download ZIP*, then unzip) or clone it
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. **Load unpacked** → pick the folder
5. Refresh LinkedIn or X

Works in any Chromium browser — Chrome, Brave, Edge, Arc.

## Notes

On X, "Not interested in this post" only exists in the timeline, not on a post's own
page. If the option isn't there, the extension leaves the menu open so you can pick
something else yourself.
