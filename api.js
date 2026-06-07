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
// Returns { success: true, data: {...} } or { success: false, error: 'message' }
export async function analyzeWithClaude(imageUri) {
  const apiKey = await getApiKey();
  if (!apiKey) return { success: false, error: 'No API key saved. Add your Anthropic key in Settings.' };

  // Step 1: read image file
  let base64;
  try {
    base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (e) {
    return {
      success: false,
      error: 'Could not read image file. Try retaking or re-choosing the photo.',
    };
  }

  // Determine media type from URI extension
  const ext       = imageUri.split('?')[0].split('.').pop()?.toLowerCase();
  const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  // Step 2: call Anthropic API
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
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
  } catch (e) {
    return { success: false, error: 'Network error — check your internet connection and try again.' };
  }

  // Step 3: parse response
  let data;
  try {
    data = await res.json();
  } catch {
    return { success: false, error: `Server returned an unexpected response (HTTP ${res.status}).` };
  }

  // Step 4: check for API-level errors
  if (data.error) {
    const msg = data.error.message || JSON.stringify(data.error);
    // Make common errors human-readable
    if (res.status === 401) return { success: false, error: 'Invalid API key — check your key in Settings.' };
    if (res.status === 429) return { success: false, error: 'Rate limit reached — wait a moment and try again.' };
    if (res.status === 400) return { success: false, error: `Bad request: ${msg}` };
    return { success: false, error: `API error: ${msg}` };
  }

  // Step 5: parse JSON from Claude's text response
  try {
    const text   = data.content?.[0]?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { success: true, data: parsed };
  } catch {
    return { success: false, error: 'Claude returned an unexpected format. Try again.' };
  }
}
