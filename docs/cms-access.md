# Getting into the CMS

This is the same guide that appears at the bottom of `/admin`. It is repeated
here so it survives if that page is ever broken.

## What the token is

Sveltia CMS commits directly to the GitHub repository. It needs a **GitHub
fine-grained personal access token** with permission to write repository
contents. There is no server in this setup and no OAuth application, so the
token is the whole of the authentication story.

The token is stored in the editor's browser (`localStorage`), never in the
repository and never on any server.

## Creating one

1. Open <https://github.com/settings/personal-access-tokens/new?name=Sveltia%20CMS&contents=write>
   — the name and permission are pre-filled.
2. **Expiration**: choose the longest available (currently one year). Fine-grained
   tokens cannot be set to never expire.
3. **Repository access**: *Only select repositories* → `sophbel.github.io`.
4. **Permissions → Repository permissions → Contents**: *Read and write*.
   Nothing else is needed. `Metadata: Read` is added automatically.
5. **Generate token**, then copy it. GitHub shows it once.
6. At `/admin`, choose **Sign in using access token** and paste it.

## Renewal

Put a calendar reminder a week before the expiry date. When it lapses the CMS
simply says you are signed out; nothing is lost, and the fix is to repeat the
steps above.

## Why the sign-in button is hidden

`config.yml` sets `auth_methods: ['token']`. Sveltia's "Sign in with GitHub"
button requires a self-hosted OAuth relay, which this setup deliberately does
not have (there is no server). Offering a button that cannot work is worse than
not offering it.

## The limit worth knowing before adding a second editor

GitHub does not allow fine-grained tokens to be used by **repository
collaborators** on a repo owned by a personal account. A student added as a
collaborator on `sophbel/sophbel.github.io` would be forced onto a *classic*
token with full `repo` scope, which reaches every repository they can see.

**Move the repository to a GitHub organisation before adding a second editor.**
Organisation members can use properly scoped fine-grained tokens.
