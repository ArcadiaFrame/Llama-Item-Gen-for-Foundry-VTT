# Changelog

## v1.1.0 - Ollama Integration & Major Updates
- ✅ **Ollama Integration:**  
  Completely transitioned from OpenAI/ChatGPT to Ollama for local LLM support.
- ✅ **Model Selection:**  
  Added support for multiple Ollama models (llama3, llama2, mistral, wizard).
- ✅ **Connection Testing:**  
  Added functionality to test Ollama connection and fetch available models.
- ✅ **Stable Diffusion Integration:**  
  Added support for Stable Diffusion Automatic1111 for image generation.
- ✅ **Image Generation Toggle:**  
  Added option to enable/disable AI image generation.
- ✅ **Repository Rename:**  
  Renamed from "ChatGPT Item Generator" to "Llama Item Generator" to reflect the new LLM backend.

## v1.0.5 - Latest Improvements & Fixes
  ✅ **API Key Change--**  
  When the OpenAI API key is changed it now refreshes the session to apply the API token to the script. 
## v1.0.4 - Latest Improvements & Fixes
- ✅ **Nested Type Handling:--
  The code now checks if the parsed JSON includes a nested type object. If present, that object is used for the item's type information; otherwise, for weapons it defaults to { value: "simpleM", baseItem: "" }.
- ✅ **Magic Fix:**
  The logic now checks for both "magical" and "magic" properties (using a robust string comparison) so that items are properly marked as magical if the JSON indicates so.
- ✅ **DALL‑E 2 Fallback:
  The generateItemImageSilent function now falls back to DALL‑E 2 if DALL‑E 3 is not subscribed to(Not very good at images).


## v1.0.3 - Latest Improvements & Fixes
- ✅ **Forced Name Override for Roll Tables:**  
  Roll table entry text is now used as the final item name when generating items from roll tables.
- ✅ **Enhanced Name Consistency:**  
  Updated the consistency fix to extract the item name from the description if it starts with `<b>Item Name:</b> ...<br>`, ensuring the final item name matches the description.
- ✅ **Refined JSON Output for Roll Tables:**  
  Strengthened the system prompt for roll table generation to output strictly valid JSON with no extraneous commentary.
- ✅ **Image Generation Prompt Update:**  
  Updated the DALL·E prompt to explicitly instruct the model to generate images without any text.
- ✅ **Expanded Weapon Keywords:**  
  The weapon keywords array now includes terms like "sabre", "blade", "lance", "longbow", "shortbow", "sling", "javelin", "handaxe", "warhammer", and "maul".
- ✅ **Unified Dialog Interface with Dropdowns:**  
  Added a custom dialog with dropdown options to select between generating a single item or a roll table.
- ✅ **Footer Button Integration:**  
  The "Generate AI (Item or RollTable)" button is now added to the footer of the Items directory via the `renderItemDirectory` hook.
- ✅ **Local Image Storage Adjustments:**  
  Updated folder creation and checks so that images are saved in the designated folder with proper error handling.
- ✅ **Weapon Type and Base Weapon Mapping:**  
  Tweaked the damage mapping to reformat ChatGPT's raw damage data into Foundry’s expected structure, and added explicit weapon type mapping and base weapon classification to better support weapon items.


## v1.0.2 - Previous Enhancements
- ✅ **Advanced Item Type Mapping:**  
  Improved mapping for D&D 5e item types (e.g., weapon, armor, consumable) based on generated descriptions.
- ✅ **Damage and Activation Data:**  
  Added support for damage calculations and activation details in generated weapon items.
- ✅ **API Key Integration:**  
  Moved API keys to Foundry’s module settings for enhanced security and easier configuration.
- ✅ **JSON Sanitization Improvements:**  
  Implemented multiple attempts to fix and sanitize JSON output from GPT to ensure valid JSON is parsed.

## v1.0.1 - Initial Improvements & Fixes
- ✅ **Local Image Saving:**  
  Enabled saving of AI-generated images using Base64 encoding to a dedicated folder.
- ✅ **Item Description Formatting:**  
  Prevented duplication of the item name in descriptions and ensured proper formatting.
- ✅ **Sidebar Button Addition:**  
  Added a UI button for generating items in the Items directory via Foundry’s sidebar hooks.

## v1.0.0 - Initial Release
- 🎉 **First Version:**  
  Launched the ChatGPT Item Generator module for Foundry VTT.
- ✅ **AI-Generated Items:**  
  Enabled AI-generated D&D 5e items with detailed lore, stats, and effects.
- ✅ **Basic API Integration:**  
  Supported OpenAI (ChatGPT and DALL·E) API key integration via module settings.
