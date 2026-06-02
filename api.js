import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

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
    // Use expo-file-system to read the image as base64 — FileReader doesn't
    // exist in React Native, so this is the correct approach in Expo projects.
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine media type from URI extension; default to jpeg
    const ext = imageUri.split('.').pop()?.toLowerCase();
    const mediaType = ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg';

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
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: `Analyze this clothing item. Return ONLY a JSON object, no extra text:
{
  "brand": "brand name if visible, else empty string",
  "name": "item name e.g. Merino ribbed turtleneck",
  "description": "one sentence style and fabric description",
  "colors": ["primary color name", "secondary color if present"],
  "color_season": "one of: Deep Winter, True Winter, Bright Winter, Soft Summer, True Summer, Light Summer, Deep Autumn, True Autumn, Soft Autumn, Light Spring, True Spring, Bright Spring",
  "category": "one of: Tops, Bottoms, Skirts, Outerwear, Shoes, Dresses, Accessories, Bags, Shorts, Pajamas, Robes, Other",
  "occasions": ["most fitting occasion from: Casual, Work, Formal, Wedding, Birthday, Date night, Funeral, Party, Travel, Gym, Beach, Weekend"],
  "size": "",
  "fit": "one of: Loose, Just right, Tight, I should really get rid of it, or empty string",
  "fabric": "primary fabric e.g. Cotton, Merino wool, Silk, Polyester",
  "pattern": "one of: Solid, Stripes, Plaid, Floral, Animal print, Houndstooth, Gingham, Polka dot, Abstract, Colorblock, Graphic, or empty string",
  "original_price": 0
}` },
          ],
        }],
      }),
    });

    const data = await res.json();

    // Surface any API-level errors clearly
    if (data.error) {
      console.error('Anthropic API error:', data.error);
      return null;
    }

    const text = data.content?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('Claude analysis failed:', e);
    return null;
  }
}
