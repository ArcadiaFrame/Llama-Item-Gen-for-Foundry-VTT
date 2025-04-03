# Llama Item Generator for Foundry VTT

![image](https://github.com/user-attachments/assets/6b890c07-544d-42b1-829a-4f93b0a73827)

## Overview
This module leverages **Ollama** to dynamically create **D&D 5e items** within Foundry VTT. Simply provide an item type (such as weapon, armor, or potion) along with a brief description, and the module will:

- **Generate a concise, thematic item name and description** using Ollama's LLM capabilities.
- **Produce a comprehensive description** complete with structured D&D 5e stats, including rarity, magical properties, weapon details, armor specifications, and damage calculations.
- **Create and locally store an AI-generated image** using Base64 encoding, ensuring the image remains available even after module updates.
- **Build roll tables** with customized entries that incorporate additional context (like city, biome, or theme details) while simultaneously generating linked items.

## Features

### AI Integration with Ollama
- **API Configuration:** Set your Ollama API URL (default: http://localhost:11434) and optional API key in module settings.
- **Structured JSON Generation:** Uses Ollama (with llama3 model) to produce structured JSON for both D&D 5e items and roll tables.
- **On-Demand Image Generation:** Uses Stable Diffusion Automatic1111 for creating item images on the fly, saving them locally.
- **Image Generation Toggle:** Option to enable or disable image generation in module settings.
- **API Configuration:** Set your Stable Diffusion Automatic1111 endpoint URL in module settings.

### Robust JSON Handling
- **Error Correction:** Employs multiple strategies to sanitize and fix invalid JSON, even utilizing the Ollama API for corrections when needed.
- **Compliance:** Ensures that the generated JSON adheres to Foundry’s expected structure for items and roll tables.

### Item Generation Capabilities
- **Automatic Mapping:** Seamlessly maps generated JSON fields (such as description, rarity, weight, price, and attunement) to the corresponding Foundry 5e item sheet fields.
- **Weapon Data Processing:**
  - Converts raw damage data (e.g., `"dice": "1d6"` and `"bonusModifiers": "+1"`) into Foundry’s damage format.
  - Applies default damage types (e.g., `"slashing"`) and supports bonus modifiers.
  - Enforces weapon properties (e.g., melee, ranged, versatile, finesse) within the item’s properties array.
- **Name Extraction:** Automatically extracts the item name from the description if it is embedded within it.

### Roll Table Generation
- **Valid JSON Output:** Generates strictly valid JSON for roll tables, ensuring a consistent number of entries.
- **Dual Modes:** Supports two roll table types:
  - **Generic Roll Tables:** Customizable entries based on thematic or location-based prompts.
  - **Item Roll Tables:** Automatically creates items for each roll table entry, using the entry text as the item name.

### User Interface Enhancements
- **Unified Dialog Interface:**
  - Features a custom dialog window with dropdown menus for selecting between item and roll table generation.
  - Provides an additional dropdown for explicit item type selection (e.g., Weapon, Armor, Consumable), which appears contextually.
  - Offers a separate dropdown for choosing roll table mode (Items vs. Generic) when generating a roll table.
- **Progress Bar:** Includes a visual progress bar overlay during AI generation to indicate processing status.
- **Footer Button Integration:** Adds a "Generate AI (Item or RollTable)" button to the Items directory footer, visible only to Game Masters.

### Damage Mapping and Weapon Classification
- **Accurate Formatting:** Refines the damage mapping logic to properly convert ChatGPT’s raw damage data into the structure required by Foundry.
- **Weapon Classification:** Features explicit weapon type mapping and classification to better support weapon items.

### Local Image Storage
- **Directory Management:** Creates and verifies designated folders within the Foundry data directory.
- **Persistent Storage:** Saves AI-generated images using Base64 encoding, ensuring local storage with robust error handling.

## Setup & Usage

1. **Install the Module**
   - **Method 1:** Install directly from Foundry VTT's Module Management using the manifest URL:
     ```
     https://raw.githubusercontent.com/ArcadiaFrame/Llama-Item-Gen-for-Foundry-VTT/main/module.json
     ```
     Make sure you're using the latest version of Foundry VTT to avoid installation issues.
   - **Method 2:** Download the latest release from the [GitHub Releases page](https://github.com/ArcadiaFrame/Llama-Item-Gen-for-Foundry-VTT/releases) and install manually.

2. **Enable** the module in your world via `Game Settings > Manage Modules`.
3. **Configure** the module in `Game Settings > Configure Settings > Llama Item Generator`:
   - Set your Ollama API URL (default: http://localhost:11434)
   - Set your Stable Diffusion API URL (if you want image generation)
   - Enable/disable image generation
   - Select your preferred Ollama model (llama3, llama2, mistral, or wizard)
   - Test your Ollama connection using the "Test Connection" button
4. **Access** the Items tab (in Foundry v12, the button is integrated in the Items directory footer).
5. **Click** the **Generate AI (Item or RollTable)** button to open the dialog, then choose whether to generate an item or a roll table.
6. For roll tables:
   - Select "Items" mode to automatically create and link generated item documents.
   - Select "Generic" mode to produce a custom table with 20 descriptive entries.
7. **Enjoy** your dynamically generated content!

## Troubleshooting & FAQ
- **Common Issues:**
  - **Ollama Connection Errors:** Ensure Ollama is running locally (or on your server) and the API URL is correctly configured. Use the "Test Connection" button in settings to verify.
  - **Model Availability:** Make sure the selected model (llama3, llama2, mistral, or wizard) is installed in your Ollama instance.
  - **Stable Diffusion Errors:** Verify that your Stable Diffusion API endpoint URL is correctly entered and the service is running if image generation is enabled.
  - **Image Saving Failures:** Ensure the module folder (`data/chatgpt-item-generator/`) has the necessary write permissions.
  - **JSON Formatting Problems:** If the output JSON is invalid, try re-running the prompt or selecting a different Ollama model.
- **General FAQs:**  
  - **How do I install Ollama?** Visit [Ollama's official website](https://ollama.ai/) for installation instructions for your operating system.
  - **Which model should I use?** Llama 3 is recommended for best results, but you can experiment with other models.
  - **Do I need Stable Diffusion?** No, image generation is optional. You can disable it in the module settings.
  
  For more help, refer to the [GitHub Issues](https://github.com/ArcadiaFrame/Llama-Item-Gen-for-Foundry-VTT/issues) page for community-driven solutions and additional support.

## Example Prompts
- **Item Prompt:**  
  "Generate a mystical sword with an enchanted blade that glows in the dark."
- **Roll Table Prompt:**  
  "Create a generic roll table for a haunted village with eerie, atmospheric entries."

## Future Roadmap
- **Planned Features:**
  - Enhanced UI customization for easier item editing.
  - Support for additional game systems beyond D&D 5e.
  - More robust error handling and logging for AI generation failures.
- **Community Contributions:**  
  Feedback and contributions are welcome to help shape future versions of the module.

## Contribution Guidelines
- **How to Contribute:**  
  Interested in contributing?

## Additional Notes
- **Local Image Storage:**  
  Images are saved in the module folder at `data/chatgpt-item-generator/`. Ensure you have the necessary file write permissions.
- **Roll Table Generation:**  
  The module requires GPT to generate exactly 20 entries for generic roll tables. If the table appears empty, try rerunning the prompt with more specific details.
- **Damage Calculations:**  
  For weapons, any provided damage string (e.g., "1d8") is automatically converted into a structured damage object that aligns with D&D 5e system requirements.


## Support
For issues or feature requests, please visit [GitHub Issues](https://github.com/ArcadiaFrame/Llama-Item-Gen-for-Foundry-VTT/issues).

## License
This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
