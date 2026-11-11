# Lecture 10 – Log in with GitHub, and create issues with the shop's token


## Video links




## Goals

After this lecture you can:

- reuse the OAuth flow from L9 with another service, and explain how GitHub differs from Google
- let an admin log in to your shop with GitHub, and decide in the shop who is admin
- call GitHub's REST API with the shop's own token, and create issues in the shop's repo
- explain the difference between a user's OAuth token and the shop's own token


You build this in your own shop in **Labb 7** – the whole lab is the VG part of Assignment 2.

## 1. Theory

Study `slides.md`: what we reuse from L9, Google vs GitHub, the flow with GitHub, who is admin, scopes, the shop's own token, the issues API, the admin's token vs the shop's own token, what happens if something is stolen, and redirect URIs for the deployed shop.

## 2. Code walkthrough: `github-oauth-walkthrough-start/`

"Log in with GitHub" for the admin, and "Report a problem" that creates an issue in the shop's repo – with the shop's own token. The login is done. The issues – `createIssue()`, `listOpenIssues()` and the form in React – are for you to build (see below).

**Create a GitHub OAuth App – once**

1. GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**
2. Homepage URL: `http://localhost:5173`. Redirect URI: `http://localhost:5173/api/auth/github/callback`. Leave **Allow wildcard matching** unchecked
3. Copy the **Client ID**, and **Generate a new client secret** – both to `.env`
4. Put your own GitHub username in `ADMIN_GITHUB_LOGINS`, and a repo you own in `GITHUB_REPO`, e.g. `anna-k/hoodie-shop`

**Create the shop's token – once**

1. GitHub → Settings → Developer settings → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
2. Expiration: e.g. 90 days. Repository access: **Only select repositories** → the repo in `GITHUB_REPO`
3. Repository permissions → **Issues: Read and write**. Nothing else
4. Copy the token to `GITHUB_ISSUES_TOKEN` at once – it is only shown when it is created

The issues get the token's account as the author. In a real shop: a separate GitHub account for the shop.

```bash
# Terminal 1 – the server
cd github-oauth-walkthrough-start/server
cp .env.example .env    # fill in the GITHUB_ values, ADMIN_GITHUB_LOGINS and SESSION_TOKEN_SECRET
npm install
npm run dev

# Terminal 2 – the client
cd github-oauth-walkthrough-start/client
npm install
npm run dev             # http://localhost:5173
```

`server/src/integrations/githubAdapter.ts` is the only file that knows GitHub. Every step is logged in the server terminal.


**Your turn:** `createIssue()` and `listOpenIssues()` in `githubAdapter.ts` are empty. Fill them in with the help of the docs links above each function. `getUser()` in the same file shows the pattern – only the URL, the method and the token differ.

In React, only the login is done. "Report a problem" is yours too: a form with a title and a description, and a list of the open issues – both calling the routes in `routes/issues.ts`. The routes and `requireAdmin` are done.

## 3. Reading instructions

- [Authorizing OAuth apps – the web application flow (GitHub Docs)](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Getting started with GitHub's REST API – the headers, the token, the answers](https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api)
- [Scopes for OAuth apps (GitHub Docs)](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [Managing your personal access tokens (GitHub Docs)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) – fine-grained tokens
- [REST API: Create an issue (GitHub Docs)](https://docs.github.com/en/rest/issues/issues#create-an-issue)

