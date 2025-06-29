# Wikimedia Vuetify & Codex OAuth application example

A basic application that:
 - Uses client side OAuth to Wikimedia to authenticate users.
 - Makes cross project authenticated API calls.
 - Makes use of Codex and Vuetify for UI components.
 - Has a Light and Dark mode toggle.

## Pages

When logged in, the edit count for Wikidata will be retrieved and displayed via authenticated API call.

![image](https://i.imgur.com/C3YJJlD.png)

A basic Wikidata display page that makes and authenticated request to the Wikidata API to retrieve an Item of your choice.

![](https://i.imgur.com/mCPyHwz.png)

And usage of the Wikimedia event stream to display events in real time.

![](https://i.imgur.com/pi0YwJq.png)

## Installation

Clone it...

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```