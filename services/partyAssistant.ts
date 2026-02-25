import { Cigarette, Drink, Food } from "../types";

interface PartyAssistantInput {
  prompt: string;
  budget?: number;
  drinks: Drink[];
  foods: Food[];
  cigarettes: Cigarette[];
}

export interface PartyAssistantSuggestion {
  title: string;
  reason: string;
  estimatedCost: number;
  picks: string[];
}

const parseCurrency = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
};

const buildFallbackSuggestions = ({ prompt, drinks, foods, cigarettes, budget }: PartyAssistantInput): PartyAssistantSuggestion[] => {
  const lowerPrompt = prompt.toLowerCase();
  const targetBudget = budget ?? 2000;

  const drinkPick = [...drinks]
    .sort((a, b) => parseCurrency(a.price) - parseCurrency(b.price))
    .slice(0, 2)
    .map((item) => item.name);

  const foodPick = [...foods]
    .sort((a, b) => parseCurrency(a.price) - parseCurrency(b.price))
    .slice(0, 2)
    .map((item) => item.name);

  const cigarettePick = [...cigarettes]
    .sort((a, b) => parseCurrency(a.price) - parseCurrency(b.price))
    .slice(0, 1)
    .map((item) => item.name);

  const chillMode = lowerPrompt.includes("chill") || lowerPrompt.includes("casual");

  return [
    {
      title: chillMode ? "Chill Starter Combo" : "Balanced Party Combo",
      reason: "Generated locally using price-optimized item ranking because AI key is unavailable.",
      estimatedCost: Math.min(targetBudget * 0.5, 1200),
      picks: [...drinkPick, ...foodPick],
    },
    {
      title: "Night-Long Upgrade",
      reason: "Keeps energy balanced with one snack + one premium beverage + optional smoke pick.",
      estimatedCost: Math.min(targetBudget * 0.8, 2200),
      picks: [...drinkPick.slice(0, 1), ...foodPick.slice(0, 1), ...cigarettePick],
    },
  ];
};

export const getPartyAssistantSuggestions = async (
  input: PartyAssistantInput
): Promise<PartyAssistantSuggestion[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return buildFallbackSuggestions(input);
  }

  const payload = {
    prompt: `You are a party planning AI. Return JSON only with format: {"suggestions":[{"title":"","reason":"","estimatedCost":0,"picks":["item"]}]}. Keep max 3 suggestions.\nPrompt:${input.prompt}\nBudget:${input.budget ?? "unknown"}\nDrinks:${JSON.stringify(input.drinks.slice(0, 12))}\nFoods:${JSON.stringify(input.foods.slice(0, 12))}\nCigarettes:${JSON.stringify(input.cigarettes.slice(0, 8))}`,
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: payload.prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    return buildFallbackSuggestions(input);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return buildFallbackSuggestions(input);
  }

  try {
    const jsonBlock = text.match(/\{[\s\S]*\}/)?.[0] || text;
    const parsed = JSON.parse(jsonBlock);
    const suggestions = parsed?.suggestions;
    if (!Array.isArray(suggestions)) {
      return buildFallbackSuggestions(input);
    }

    return suggestions.slice(0, 3).map((item: any) => ({
      title: String(item.title || "AI Suggestion"),
      reason: String(item.reason || "AI-generated recommendation"),
      estimatedCost: parseCurrency(item.estimatedCost),
      picks: Array.isArray(item.picks) ? item.picks.map((pick: unknown) => String(pick)).slice(0, 6) : [],
    }));
  } catch {
    return buildFallbackSuggestions(input);
  }
};
