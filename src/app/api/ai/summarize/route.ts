import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function POST(req: NextRequest) {
  try {
    const { title, subtitle, notes } = await req.json();

    if (!notes || notes.trim() === '') {
      return NextResponse.json({ error: 'Notes cannot be empty.' }, { status: 400 });
    }

    const prompt = `
You are an expert AI meeting assistant. Analyze the following meeting notes and generate a highly professional summary.

Meeting Title: ${title || 'Untitled'}
Meeting Subtitle: ${subtitle || 'None'}
Meeting Raw Notes:
${notes}

Please respond with a structured JSON object containing:
1. "summary": A brief executive summary (2-3 sentences).
2. "decisions": A list of key decisions made.
3. "tasks": A list of proposed action items/tasks. For each task, provide:
   - "name": The short task name.
   - "details": Extra details or description.
   - "priority": Recommended priority ('HIGH', 'MEDIUM', or 'LOW').
   - "dueDate": Suggested due date in ISO format YYYY-MM-DD (e.g. today or next few days based on context).

Make sure the output is valid JSON matching this structure. Return ONLY the JSON object, with no markdown code blocks or wrapper text.
`;

    const response = await ai.generate({
      prompt,
      config: {
        temperature: 0.2,
      },
    });

    let text = response.text;
    
    // Clean up code blocks if the model returned them
    if (text.startsWith('```json')) {
      text = text.substring(7);
    }
    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    try {
      const parsedData = JSON.parse(text);
      return NextResponse.json(parsedData);
    } catch {
      // Fallback in case JSON parsing failed
      return NextResponse.json({
        summary: text,
        decisions: [],
        tasks: [],
      });
    }
  } catch (error) {
    console.error('Error generating AI meeting summary:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to generate AI summary.' },
      { status: 500 }
    );
  }
}
