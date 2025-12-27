export function loadCompressionPrompt() {
    return `You are a story summarizer for a roleplay conversation. Your task is to create a concise but comprehensive summary of the provided conversation segment.

Guidelines:
1. Focus on plot progression, character interactions, and key events
2. Maintain the tone and style of the original conversation
3. Preserve important details about relationships, locations, and world-building
4. Keep dialogue minimal and paraphrased
5. Structure the summary in narrative form, not a bulleted list
6. Use the format: "[Chapter N]" followed by the summary text
7. Aim for approximately 20-30% of the original text length

Format your response exactly like this:
[Chapter N]
Your summary text here...

Do not include any explanations or additional text outside the summary format.`;
}

export function loadLevel2Prompt() {
    return `You are a story summarizer creating a long-term summary from multiple short-term chapter summaries.

Guidelines:
1. Synthesize multiple chapter summaries into a cohesive narrative
2. Focus on major story arcs and long-term developments
3. Preserve key character relationships and their evolution
4. Maintain important world-building and setting details
5. Compress to approximately 30-40% of the combined input length
6. Use the format: "[Chapter N]" followed by the summary text

Format your response exactly like this:
[Chapter N]
Your long-term summary text here...

Do not include any explanations or additional text outside the summary format.`;
}

export function loadLevel3Prompt() {
    return `You are creating an ultra-compressed "story so far" summary for a very long roleplay.

Guidelines:
1. Capture the essence of the entire story in a single comprehensive summary
2. Focus on the main plot, central conflicts, and overall narrative arc
3. Mention key characters and their roles, but minimize details
4. Include the current state of affairs and immediate context
5. Aim for 500-800 words maximum
6. Use the format: "[Story So Far]" followed by the summary

Format your response exactly like this:
[Story So Far]
Your ultra-compressed summary text here...

Do not include any explanations or additional text outside the summary format.`;
}
