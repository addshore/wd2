# Wikimedia Vuetify & Codex OAuth application example

A basic application that:
 - Uses client side OAuth to Wikimedia to authenticate users.
 - Makes cross project authenticated API calls.
 - Makes use of Codex and Vuetify for UI components.
 - Has a Light and Dark mode toggle.
 - Basic backend API

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

## Backend API

This template now includes a simple backend API using Express.js.

- **Endpoint:** `/hello` (returns the string `world`)
- **How to run:**

```bash
npm install express cors
node backend/index.js
```

The frontend will call this API and display the result on the main page.

## Run Frontend and Backend Together

To run both the frontend (Vite) and backend (Express) development servers at once, use:

```bash
./dev-all.sh
```

## Running Tests

To run all tests (including backend API tests):

```bash
npx vitest run
```