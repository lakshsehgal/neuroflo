export async function sendSlackMessage(
  webhookUrl: string,
  payload: {
    text: string;
    blocks?: Record<string, unknown>[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Slack returned ${res.status}: ${body}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export function buildSlackBlocks(
  title: string,
  body: string,
  context: { label: string; value: string }[],
  link?: { text: string; url: string }
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: { type: "plain_text", text: title, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: body },
    },
  ];

  const contextParts = context.filter((c) => c.value);
  if (contextParts.length > 0) {
    blocks.push({
      type: "context",
      elements: contextParts.map((c) => ({
        type: "mrkdwn",
        text: `*${c.label}:* ${c.value}`,
      })),
    });
  }

  if (link) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: link.text },
          url: link.url,
          action_id: "open_link",
        },
      ],
    });
  }

  return blocks;
}
