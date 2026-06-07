# DeepSeek V4 Pro Agent configuration

The in-app Agent defaults to the DeepSeek OpenAI-compatible Chat Completions API.

You can configure it directly inside the Android app:

1. Open the Talk Bar.
2. Tap the `设` button.
3. Fill your DeepSeek API key. The URL and model are already configured.
4. Save, then send a message.

Example API URL:

```text
https://api.deepseek.com/chat/completions
```

For local web development, copy `.env.example` to `.env.local` and fill:

```text
VITE_AGENT_API_URL=https://api.deepseek.com
VITE_AGENT_API_KEY=sk-22ef6bcefdf146d5804eb3c3c6d3cc11
VITE_AGENT_MODEL=deepseek-v4-pro
```

Runtime settings saved in the app override environment values.

Default model:

```text
deepseek-v4-pro
```

## Security

Runtime API keys are stored in the device's local web storage. This is acceptable for personal testing, but a production release should call a backend proxy so the provider API key is never shipped to or stored by the app.
