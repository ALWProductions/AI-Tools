
import { GoogleGenAI, Type } from "@google/genai";
import { EmailSection, AffinityGroup, EmailComponent } from "../types";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function analyzeEmailStructure(html: string): Promise<EmailSection[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: `Analyze the following Table-based Email HTML. Identify and label sections based on these specific HTML comments: 
    - <!-- View in Browser -->
    - <!-- 2 Column - Logo and Button -->
    - <!-- Header Image -->
    - <!-- Signature -->
    - <!-- Footer -->
    
    Categorize all other content blocks as "Story Content".
    Return a JSON array of sections with: label, the raw HTML content, and isPreserved (true for structural comments listed above).

    HTML:
    ${html}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            content: { type: Type.STRING },
            isPreserved: { type: Type.BOOLEAN }
          },
          required: ["label", "content", "isPreserved"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse AI response for email structure", e);
    return [];
  }
}

export async function mergeEmailContent(
  sourceSections: EmailSection[],
  targetSections: EmailSection[],
  selectedComponents: EmailComponent[],
  sourceHead: string,
  affinityGroup: AffinityGroup
): Promise<string> {
  const sourceContent = sourceSections.filter(s => !s.isPreserved).map(s => s.content).join('\n');
  
  const brandingRules = {
    [AffinityGroup.CHI]: { link: "#0171c2", btn: "#64a000" },
    [AffinityGroup.DIGNITY]: { link: "#0171c2", btn: "#0171C2" },
    [AffinityGroup.MOUNTAIN]: { link: "#70457D", btn: "#70457D" }
  };
  const rules = brandingRules[affinityGroup];

  // Map components for easier LLM instructions
  const signatures = selectedComponents.filter(c => c.type === 'SIGNATURE').map(c => c.content).join('\n');
  const footers = selectedComponents.filter(c => c.type === 'FOOTER').map(c => c.content).join('\n');
  const logos = selectedComponents.filter(c => c.type === 'LOGO_NAV').map(c => c.content).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: `Task: Create a versioned Email HTML.
    
    HEAD CONTENT: ${sourceHead}
    TARGET SKELETON: ${targetSections.map(s => `[${s.label}]: ${s.content}`).join('\n')}
    NEW STORY CONTENT: ${sourceContent}
    SELECTED LIBRARY ELEMENTS:
    - Signatures: ${signatures}
    - Footers: ${footers}
    - Logos: ${logos}

    INSTRUCTIONS:
    1. Keep the <head> exactly as provided.
    2. Maintain the target skeleton structure.
    3. Inject NEW STORY CONTENT into target sections that are NOT preserved (like "Story Content").
    4. If LIBRARY ELEMENTS were provided (Signatures, Footers, Logos), use THEM instead of the target's original sections for those types.
    5. Update all <a> links and buttons in the NEW STORY content to use branding: Link Color ${rules.link}, Button Color ${rules.btn}.
    6. Return ONLY the raw HTML. No markdown, no triple backticks.`
  });

  let cleaned = response.text || "";
  cleaned = cleaned.replace(/```html/gi, '').replace(/```/g, '').trim();
  return cleaned;
}

export async function generateAltText(imageSrc: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: `Brief description for image alt-text: ${imageSrc}. Text only.`
  });
  return response.text?.trim() || "Email image";
}
