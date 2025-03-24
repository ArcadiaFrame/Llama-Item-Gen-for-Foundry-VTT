# ChatGPT Item Generator for Foundry VTT

## Overview
This module uses **ChatGPT** and **DALL·E** to dynamically generate **D&D 5e items** within Foundry VTT. You can prompt for an item type (weapon, armor, potion, etc.) and a brief description; the module will then:
- **Generate a short, thematic item name** via ChatGPT.
- **Produce a long, detailed description** with structured D&D 5e stats (e.g., rarity, magical flag, weapon properties, armor details, damage calculations).
- **Generate and store an AI image locally** using Base64 encoding, ensuring that images persist across module updates.
- **Optionally create a roll table**, with tailored entries that include additional context (such as city, biome, or theme details) and automatically link generated items.

## Installation

### You **must** make a new user directory folder named "chatgpt-item-generator"

1. **Download or install** the module via Foundry’s module manager.
2. **Enable** it in `Game Settings > Manage Modules`.
3. **Enter** your API keys in **`Game Settings > Module Settings > ChatGPT Item Generator`**:
   - **OpenAI API Key** (for ChatGPT text generation)
   - **DALL·E API Key** (for image generation)
4. Open the **Items** tab and click **Generate AI (Item or RollTable)** (the button is added via a sidebar hook in Foundry v12).

## Features

### AI-Generated Item Names
- Short, thematic titles for your fantasy items generated by ChatGPT.

### Long, Structured Descriptions
- Detailed lore, rarity, attunement, and other D&D 5e fields are provided in a structured JSON format.

### Weapon & Armor Support
- **Weapon Properties:** Automatically assigns properties (e.g., finesse, heavy, light) and includes damage calculations (e.g., damage dice and modifiers) formatted for D&D 5e.
- **Armor Fields:** Manages Armor Class (AC), armor type, and Dexterity cap according to the D&D 5e system.

### Magical or Mundane
- ChatGPT determines if an item is magical based on its rarity or other criteria, ensuring that items are correctly flagged.

### Advanced Item Type Mapping
- Supports common D&D 5e item types such as weapon, armor, potion, scroll, ring, wand, tool, loot, etc.

### Local AI Image Storage
- AI-generated images are saved locally using Base64 encoding.
- Images are stored in a dedicated folder (`data/chatgpt-item-generator/`), ensuring they persist across module updates and can be reliably loaded in the item sheet.

### No Hardcoded API Keys
- API keys for OpenAI and DALL·E are entered via Foundry’s module settings, keeping sensitive data secure.

### Unified Dialog Interface
- A custom Foundry dialog with dropdowns allows you to choose between generating a single item or a roll table (with separate modes for items vs. generic), streamlining the workflow.

## Roll Table Support:

### Generic Roll Table Support
- For generic roll tables, the module instructs ChatGPT to include context-specific details (such as city, biome, or theme characteristics) so that the results are tailored and descriptive.
- The system is designed to generate exactly 20 entries for generic roll tables, ensuring a consistent and rich dataset.

### Roll Table Linking
- When generating roll tables in "items" mode, each roll table entry automatically creates a unique item document and links it properly, ensuring seamless integration.


## Setup & Usage
1. **Enable** the module in your world under `Manage Modules`.
2. **Enter** your OpenAI API keys in `Game Settings > Module Settings > ChatGPT Item Generator`.
3. **Open the Items tab** (in Foundry v12, the button is placed via the `renderSidebarTab` hook).
4. **Click** **Generate AI (Item or RollTable)** to open the dialog, then choose whether to generate an item or a roll table.
5. For roll tables:
   - Select "Items" mode to automatically create and link generated item documents.
   - Select "Generic" mode to generate a tailored table with 20 descriptive entries.
6. **Enjoy** your dynamically generated content!

## Notes
- **Local Image Storage:**  
  Generated images are saved in the module folder under `data/chatgpt-item-generator/`. Ensure that you have appropriate permissions for file writing.
- **Roll Table Generation:**  
  The module requires GPT to generate exactly 20 entries for generic roll tables. If the table is empty, try re-running the prompt with more specific environmental details.
- **Damage Calculations:**  
  For weapons, if GPT provides a damage string (e.g., "1d8"), it is automatically converted into a structured damage object that matches the D&D 5e system’s requirements.
  
## Support
For issues or feature requests, visit [GitHub Issues](https://github.com/f3rr311/ChatGPT-Item-Gen-for-Foundry-VTT/issues).

## License
This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
