# Developer Guidelines - n8n Zalo Bot Community Node

This document outlines the development standards, codebase structure, integration rules, and metadata for **n8n Community Node for Zalo Bot** projects by **Jay Nguyen**.

Any AI coding assistant working on this repository must read and adhere to these guidelines.

---

## 1. Unified Author Metadata

All community node packaging and marketing materials use the following metadata structure:

### `package.json` Configuration
```json
"author": {
  "name": "Jay Nguyen (Nguyễn Thiệu Toàn)",
  "email": "me@nguyenthieutoan.com",
  "url": "https://nguyenthieutoan.com"
}
```

### Introduction Header in `README.md`
To maintain a professional presentation on the npm registry, place the following markdown block directly beneath the main title of `README.md`:

```markdown
Developed with love by **[Jay Nguyen (Nguyễn Thiệu Toàn)](https://nguyenthieutoan.com)**, a **[Verified n8n Creator](https://n8n.io/creators/nguyenthieutoan)** & CEO/Founder of **[GenStaff](https://genstaff.net)**.

**Connect with me:**
[LinkedIn](https://www.linkedin.com/in/nguyenthieutoan) | [Facebook](https://www.facebook.com/nguyenthieutoan) | [Website](https://nguyenthieutoan.com) | [Email](mailto:me@nguyenthieutoan.com)
```

---

## 2. Naming Conventions

To prevent n8n runtime lookup failures and maximize user experience:

1. **File-to-Class Match:**
   n8n strictly mandates that the Class name inside `.node.ts` or `.credentials.ts` must match the file name prefix exactly.
   * *Correct example:* Class `ZaloBot` must be inside `ZaloBot.node.ts`.
   * *Correct example:* Class `ZaloBotTrigger` must be inside `ZaloBotTrigger.node.ts`.
   * *Correct example:* Class `ZaloBotApi` must be inside `ZaloBotApi.credentials.ts`.
2. **Display Names:**
   * Action Node Display Name: `Zalo Bot` (Internal system name: `zaloBot`). Hậu tố "Node" is prohibited.
   * Trigger Node Display Name: `Zalo Bot Trigger` (Internal system name: `zaloBotTrigger`). Must end with a space followed by `" Trigger"`.

---

## 3. Zero-Dependency Architecture

To eliminate runtime package version collisions on hosting environments:

1. **Empty `dependencies` Object:**
   The `dependencies` field in `package.json` must remain `{}`.
2. **Peer & Development Dependencies:**
   * Third-party SDKs, types, and the `n8n-workflow` library must be declared under `peerDependencies` (to leverage n8n core packages at runtime) and `devDependencies` (for typescript compiler mapping).
3. **Static Asset Bundling (Gulp):**
   * Use Gulp (`gulpfile.js`) to copy static icons (`.png`, `.svg`) from `/nodes` and `/credentials` source directories into `/dist`, maintaining the directory architecture so n8n can load graphics correctly.

---

## 4. Webhook Lifecycle and Conflict Mitigation

The Zalo Bot Platform enforces mutual exclusion between active webhooks and `/getUpdates` polling loops using the same token. Long polling calls will silently delete webhook registrations.

### 4.1 Webhook Management Methods
The `ZaloBotTrigger` class controls webhooks programmatically:
* **`checkExists`**: Polls `/getWebhookInfo` to verify if the registered webhook on Zalo matches the current workflow URL. The comparison function must normalize the paths by removing trailing slashes (`/`).
* **`create`**: Computes an automatic SHA256 of the token, truncates it to 32 characters, stores it in workflow static data, and POSTs it as `secret_token` to `/setWebhook`.
* **`delete`**: Issues a `/deleteWebhook` POST request to release token resources when the workflow is deactivated.

### 4.2 Security Verification
Upon receiving HTTP POST requests on the webhook endpoint, verify that the `x-bot-api-secret-token` header matches the saved static token signature. Discard non-matching requests to block spoofing attempts.

---

## 5. Compilation and Release Checklist

When packaging and publishing new versions to the npm registry, execute the following actions sequentially:

1. **Verify Build and Type Checks:**
   Ensure the code builds and lints cleanly:
   ```bash
   npm run build; npm run lint
   ```
2. **Increment version and tag:**
   Run the following to automatically increment version in `package.json` and generate a local Git tag:
   ```bash
   npm version <patch|minor|major>
   ```
3. **Trigger Automated CD Publish Pipeline:**
   Push the commit and tags to the remote repository. The GitHub Action workflow will build and publish the node package to the npm registry with provenance:
   ```bash
   git push origin main --follow-tags
   ```

---

## 6. Official Approval Criteria

### 6.1 Package Specifications
* **Node.js Environment**: Minimum required runtime version `v22.22.0` or higher.
* **TypeScript Settings**: `tsconfig.json` must set `"declaration": true`.
* **npm Keywords**: `package.json` keywords must include `"n8n-community-node-package"`.

### 6.2 UI/UX Rules
* **Icons**: Static PNG format with resolution $60 \times 60\text{ px}$.
* **Capitalization**: Title Case for resource/operation names, Sentence Case for help and tooltips.
* **Progressive Disclosure**: Keep critical fields first. Put optional options within `Additional Fields` (`additionalFields`).

### 6.3 Verification Tests
* **Credentials testing**: Always use `this.helpers.httpRequest` to execute the connection handshake check.
* **Data Immutability**: Deep copy input items using `JSON.parse(JSON.stringify(item))` if properties are modified to prevent runtime state leak.
* **Error Handling**: Throw `NodeApiError` for request failures, `NodeOperationError` for formatting or logic errors.
