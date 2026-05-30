import * as SecureStore from 'expo-secure-store';

const SECURE_KEY = 'myfit_anthropic_key';

// ── Key storage ────────────────────────────────────────────────────────────────
export async function getApiKey() {
  try { return await SecureStore.getItemAsync(SECURE_KEY); }
  catch { return null; }
}

export async function saveApiKey(key) {
  try { await SecureStore.setItemAsync(SECURE_KEY, key); return true; }
  catch { return false; }
}

export async function deleteApiKey() {
  try { await SecureStore.deleteItemAsync(SECURE_KEY); return true; }
  catch { return false; }
}

// ── Claude image analysis ──────────────────────────────────────────────────────
export async function analyzeWithClaude(imageUri) {
  const apiKey = await getApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: `Analyze this clothing item. Return ONLY a JSON object, no extra text:
{
  "brand": "brand name if visible, else empty string",
  "name": "item name e.g. Merino ribbed turtleneck",
  "description": "one sentence style and fabric description",
  "colors": ["primary color name", "secondary color if present"],
  "color_season": "one of: Deep Winter, True Winter, Bright Winter, Soft Summer, True Summer, Light Summer, Deep Autumn, True Autumn, Soft Autumn, Light Spring, True Spring, Bright Spring",
  "category": "one of: Tops, Bottoms, Skirts, Outerwear, Shoes, Dresses, Accessories, Bags, Other",
  "occasions": ["most fitting occasion from: Casual, Work, Formal, Wedding, Birthday, Date night, Funeral, Party, Travel, Gym, Beach, Weekend"],
  "size": "",
  "fit": "one of: Loose, Just right, Tight, I should really get rid of it, or empty string",
  "fabric": "primary fabric e.g. Cotton, Merino wool, Silk, Polyester",
  "original_price": 0
}` },
          ],
        }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('Claude analysis failed:', e);
    return null;
  }
}
