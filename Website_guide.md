# Website Guide

## Accepting Future Payments from AI Agents

To accept donations from AI agents, you have to bypass the traditional donation form UI. Agents don't navigate landing pages or click "Donate Now" buttons; they interact with machine-readable endpoints and require autonomous authorization.

As of 2026, the industry has standardized around a few key protocols that allow "headless" machine-to-machine payments.

### The Standard Agent Payment Protocols

If you want to accept agent funds today, your website needs to support one of these three frameworks:

#### 1. Stripe's Machine Payments Protocol (MPP)

If your organization already uses Stripe, this is the most practical route. Co-developed by Stripe and Tempo, MPP allows agents to programmatically request, authorize, and complete transactions using standard primitives like the PaymentIntents API.

**Best for:** Nonprofits wanting to accept both fiat (cards) and stablecoins without building custom blockchain infrastructure.

#### 2. x402 (The HTTP 402 Standard)

After sitting dormant since the 1990s, the HTTP 402 Payment Required status code is now the backbone of the API-native agent economy. Any web API can use x402 to challenge an agent for payment before completing an action.

**Best for:** Web3-native organizations or those wanting direct stablecoin (like USDC on Base) settlements with zero intermediaries.

#### 3. Agent Payments Protocol (AP2)

Part of the broader open-source agent commerce ecosystem, AP2 focuses on delegated-spending mandates. It uses Verifiable Digital Credentials (VDCs) to ensure the agent is authorized to spend a human's money within explicit constraints (e.g., a user tells their agent: "Donate up to $50 to this specific charity").

**Best for:** Processing highly auditable, human-approved donations where the agent is acting on behalf of a specific donor's wallet or card.

### The Machine-to-Machine Donation Flow

While human checkout is built for friction and persuasion, agent payments are built on a strict, real-time handshake. Here is how an agent actually completes a donation using the standard 402 challenge model:

1. **Discovery & Intent** — The agent locates your headless donation endpoint and sends an initial `POST` request to donate a specific amount.
2. **The Challenge** — Your server rejects the initial request with a `402 Payment Required` status code. It injects the payment terms (price, acceptable networks like Base/USDC, or a Stripe PaymentIntent) directly into the response payload.
3. **Autonomous Settlement** — The agent reads the terms, executes the transaction on-chain or via their delegated payment credentials, and secures a cryptographic token as proof of payment.
4. **Completion & Receipt** — The agent retries the original request, attaching the payment token to the header. Your server verifies the token and returns a `200 OK` with the digital tax receipt.

### Next Steps for Your Website

To make this work, you don't need to rebuild your whole site, but you do need to give agents a door to walk through:

- **Expose an API Endpoint:** Create a dedicated `/v1/donate` endpoint.
- **Make it Discoverable:** Agents need to know your charity exists, what you do, and where to send the money. You can use the Model Context Protocol (MCP) to expose your mission statement, tax ID, and endpoints so agents can parse them automatically.
- **Choose Your Settlement:** If you want maximum reach with minimal engineering, turn on MPP in your Stripe dashboard. If you want direct-to-wallet stablecoin donations, set up an x402 challenge.
