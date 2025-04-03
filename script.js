class ChatGPTItemGenerator {
  constructor() {
    this.apiUrl = game.settings.get("chatgpt-item-generator", "ollamaApiUrl") || "http://localhost:11434";
    this.stableDiffusionUrl = game.settings.get("chatgpt-item-generator", "stableDiffusionUrl") || "";
    this.enableImageGeneration = game.settings.get("chatgpt-item-generator", "enableImageGeneration") || false;
    this.selectedModel = game.settings.get("chatgpt-item-generator", "selectedModel") || "llama3";
    this.availableModels = [];
    // List of keywords for forced name inclusion (used in auto-generation only)
    this.keywords = ["ring", "amulet", "dagger", "sword", "shield", "gloves", "cloak", "potion"];
    // Save images under data/chatgpt-item-generator
    this.imageFolder = "chatgpt-item-generator";
  }

  static registerSettings() {
    game.settings.register("chatgpt-item-generator", "ollamaApiUrl", {
      name: "Ollama API URL",
      hint: "Enter your Ollama API URL (default: http://localhost:11434)",
      scope: "world",
      config: true,
      type: String,
      default: "http://localhost:11434",
      onChange: value => window.location.reload()
    });
    game.settings.register("chatgpt-item-generator", "stableDiffusionUrl", {
      name: "Stable Diffusion API URL",
      hint: "Enter your Stable Diffusion API URL for image generation. Leave empty to disable image generation.",
      scope: "world",
      config: true,
      type: String,
      default: "",
      onChange: value => window.location.reload()
    });
    game.settings.register("chatgpt-item-generator", "enableImageGeneration", {
      name: "Enable Image Generation",
      hint: "Toggle to enable or disable AI image generation for items.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: value => {
        if (game.chatGPTItemGenerator) {
          game.chatGPTItemGenerator.enableImageGeneration = value;
        }
        window.location.reload();
      }
    });
    game.settings.register("chatgpt-item-generator", "selectedModel", {
      name: "Ollama Model",
      hint: "Select which Ollama model to use for item generation",
      scope: "world",
      config: true,
      type: String,
      default: "llama3",
      choices: {
        "llama3": "Llama 3",
        "llama2": "Llama 2",
        "mistral": "Mistral",
        "wizard": "Wizard"
      },
      onChange: value => {
        if (game.chatGPTItemGenerator) {
          game.chatGPTItemGenerator.selectedModel = value;
        }
        window.location.reload();
      }
    });
    
    // Connection status display
    game.settings.register("chatgpt-item-generator", "verifyOllamaConnection", {
      name: "Connection Status",
      hint: "Current status of Ollama connection",
      scope: "world",
      config: true,
      type: String,
      default: "Not Verified",
      choices: {
        "Not Verified": "Not Verified",
        "Verified": "Verified",
        "Failed": "Failed"
      },
      onChange: value => {}
    });
    
    // Add a button to verify connection
    game.settings.registerMenu("chatgpt-item-generator", "verifyConnection", {
      name: "Verify Ollama Connection",
      label: "Test Connection",
      hint: "Click to verify connection to Ollama server and fetch available models",
      icon: "fas fa-plug",
      type: VerifyOllamaConnectionDialog,
      restricted: true
    });
  }

  /* --------------------------------
   * Progress Bar Helpers (Optional)
   * ------------------------------- */
  showProgressBar() {
    if ($('#ai-progress-container').length === 0) {
      $('body').append(`
        <div id="ai-progress-container" style="position: fixed; top: 20%; left: 50%; transform: translateX(-50%); width: 300px; padding: 10px; background: #222; color: #fff; border: 1px solid #000; border-radius: 5px; z-index: 10000;">
          <h3 style="margin:0 0 10px;">Generating AI Object...</h3>
          <div style="background:#ccc; border-radius:5px; width:100%; height:20px;">
            <div id="ai-progress-bar" style="background:#09f; width:0%; height:100%; border-radius:5px;"></div>
          </div>
          <p id="ai-progress-text" style="text-align:center; margin:5px 0 0;">0%</p>
        </div>
      `);
    }
  }

  updateProgressBar(value) {
    $('#ai-progress-bar').css('width', `${value}%`);
    $('#ai-progress-text').text(`${value}%`);
  }

  hideProgressBar() {
    $('#ai-progress-container').remove();
  }

  /* --------------------------------
   * 1) JSON & Fix Tools
   * ------------------------------- */
  sanitizeJSON(jsonStr) {
    return jsonStr
      .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
      .replace(/(?<!\\)"/g, '\\"');
  }

  async fixInvalidJSON(badJSON) {
    const response = await fetch(`${this.apiUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.selectedModel,
        prompt: `Fix this invalid JSON: ${badJSON}. Remove any disclaimers, partial lines, or text outside of the JSON object. If there is text before or after the JSON braces, remove it. Fix it so it's strictly valid JSON with double-quoted property names. No extra commentary.`,
        stream: false
      })
    });
    let data = await response.json();
    return data.response?.trim() || badJSON;
  }

  /* --------------------------------
   * 2) Image Generation with Base64 & Local Saving (with Stable Diffusion)
   * ------------------------------- */
  async generateItemImageSilent(prompt) {
    // Check if image generation is enabled in settings
    if (!this.enableImageGeneration) {
      console.log("Image generation is disabled in settings");
      return "";
    }
    
    // Check if Stable Diffusion URL is set
    if (!this.stableDiffusionUrl) {
      console.log("Stable Diffusion URL is not set");
      ui.notifications.warn("Image generation is enabled but Stable Diffusion URL is not set.");
      return "";
    }
    
    // Stable Diffusion Automatic1111 API call
    let response = await fetch(this.stableDiffusionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "prompt": `fantasy D&D item, ${prompt}, highly detailed, digital painting, artstation, concept art, smooth, sharp focus, illustration`,
        "negative_prompt": "text, watermark, signature, low quality, blurry",
        "steps": 20,
        "width": 512,
        "height": 512
      })
    }).catch(error => {
      console.error("Error connecting to Stable Diffusion server:", error);
      ui.notifications.error("Failed to connect to Stable Diffusion server for image generation.");
      return { ok: false };
    });
    
    if (!response.ok) {
      return "";
    }
    
    let data = await response.json();
    if (data.images && data.images[0]) {
      const dataUrl = `data:image/png;base64,${data.images[0]}`;
      const fileName = `${prompt.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.png`;
      const targetFolder = this.imageFolder;
      await this.createFolder(targetFolder);
      await this.checkFolder(targetFolder);
      const localPath = await this.saveImageLocally(dataUrl, fileName, targetFolder);
      return localPath;
    } else if (data.data && data.data[0]?.b64_json) {
      const dataUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      const fileName = `${prompt.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.png`;
      const targetFolder = this.imageFolder;
      await this.createFolder(targetFolder);
      await this.checkFolder(targetFolder);
      const localPath = await this.saveImageLocally(dataUrl, fileName, targetFolder);
      return localPath;
    }
    return "";
  }

  async createFolder(folderPath) {
    try {
      await FilePicker.createDirectory("data", folderPath);
      console.log("Attempted folder creation:", folderPath);
    } catch (err) {
      console.warn("Folder creation error (likely already exists):", err);
    }
  }

  async checkFolder(folderPath) {
    try {
      const folderData = await FilePicker.browse("data", folderPath);
      if (!folderData || !folderData.dirs.includes(folderPath)) {
        console.error("Folder does not exist after creation attempt:", folderPath);
      } else {
        console.log("Folder confirmed:", folderPath);
      }
    } catch (err) {
      console.error("Error checking folder existence:", err);
    }
  }

  async saveImageLocally(dataUrl, fileName, targetFolder) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: blob.type });
    try {
      const upload = await FilePicker.upload("data", targetFolder, file, { notify: false });
      console.log("Saved image locally:", upload);
      return `${targetFolder}/${fileName}`;
    } catch (err) {
      console.error("Error saving image locally:", err);
      return "";
    }
  }

  /* --------------------------------
   * Helper Methods for Weapon Damage & Properties
   * ------------------------------- */
  transformWeaponDamage(damage) {
    if (!damage) return { parts: [] };
    if (damage.parts && Array.isArray(damage.parts)) {
      return damage;
    }
    
    // Handle dnd5e system damage structure
    if (damage.dice) {
      let formula = damage.dice;
      if (damage.modifier) {
        let mod = damage.modifier;
        if (!mod.startsWith('+') && !mod.startsWith('-')) {
          mod = '+' + mod;
        }
        formula += mod;
      }
      let damageType = damage.type || "";
      
      // Create a damage object that aligns with dnd5e system's DamageData structure
      // This ensures compatibility with the system's damage calculations
      let diceMatch = damage.dice.match(/(\d+)d(\d+)/);
      let base = {
        number: diceMatch ? parseInt(diceMatch[1]) : 0,
        denomination: diceMatch ? parseInt(diceMatch[2]) : 0,
        bonus: damage.modifier || "",
        types: new Set([damageType])
      };
      
      return { 
        parts: [[formula, damageType]],
        base: base,
        versatile: {}
      };
    }
    return { parts: [] };
  }

  transformWeaponProperties(wp) {
    let properties = [];
    if (!wp) return properties;
    
    // Map of common property names to dnd5e system property keys
    const propertyMap = {
      "versatile": "ver",
      "finesse": "fin",
      "heavy": "hvy",
      "light": "lgt",
      "loading": "lod",
      "reach": "rch",
      "thrown": "thr",
      "two-handed": "two",
      "ammunition": "amm",
      "special": "spc",
      "silvered": "sil",
      "adamantine": "ada",
      "magical": "mgc",
      "melee": "mel",
      "ranged": "rng"
    };
    
    if (Array.isArray(wp)) {
      for (let prop of wp) {
        const propLower = prop.toString().toLowerCase();
        // Check if the property exists in our map
        for (let [key, value] of Object.entries(propertyMap)) {
          if (propLower.includes(key)) {
            properties.push(value);
            break;
          }
        }
        // If no match found, add the original property
        if (!Object.keys(propertyMap).some(key => propLower.includes(key))) {
          properties.push(propLower);
        }
      }
    } else if (typeof wp === 'object') {
      for (let key in wp) {
        if (wp.hasOwnProperty(key)) {
          const keyLower = key.toLowerCase();
          // Check if the key exists in our map
          for (let [mapKey, value] of Object.entries(propertyMap)) {
            if (keyLower.includes(mapKey)) {
              properties.push(value);
              break;
            }
          }
          // If no match found, add the original property
          if (!Object.keys(propertyMap).some(mapKey => keyLower.includes(mapKey))) {
            properties.push(`${key}: ${wp[key]}`.toLowerCase());
          }
        }
      }
    } else {
      const propLower = wp.toString().toLowerCase();
      // Check if the property exists in our map
      for (let [key, value] of Object.entries(propertyMap)) {
        if (propLower.includes(key)) {
          properties.push(value);
          break;
        }
      }
      // If no match found, add the original property
      if (!Object.keys(propertyMap).some(key => propLower.includes(key))) {
        properties.push(propLower);
      }
    }
    return properties;
  }

  /* --------------------------------
   * 3) Item Generation Functions
   * ------------------------------- */
  async generateItemJSON(prompt, explicitType = "") {
    const typeNote = explicitType ? ` The item type is ${explicitType}.` : "";
    const response = await fetch(`${this.apiUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.selectedModel,
        prompt: `You are a Foundry VTT assistant creating structured JSON for a single, consistent DnD 5e item.${typeNote} Do not include an explicit item name field; instead, output the item description beginning with '<b>Item Name:</b> ' followed by the item name and a '<br>' tag, then the detailed lore. The JSON must include a non-empty 'description' field (which starts with this marker) along with the fields 'rarity', 'weight', 'price', and 'requiresAttunement'. If it's a weapon, include 'weaponProperties', a 'damage' field with the damage dice (e.g., '1d8', '2d6') and any bonus modifiers, and also include a nested 'type' object with keys 'value' (e.g. 'simpleM', 'martialM') and 'baseItem' (e.g., 'longsword'). Decide if 'magical' is true or false. Output valid JSON with double-quoted property names and no extra text. User request: ${prompt}`,
        stream: false
      })
    });
    let data = await response.json();
    return data.response?.trim() || "{}";
  }

  async parseItemJSON(raw) {
    console.log("Raw JSON from GPT:", raw);
    try {
      return JSON.parse(raw);
    } catch (err1) {
      console.warn("Could not parse item JSON; second GPT fix:", err1);
      let fixed = await this.fixInvalidJSON(raw);
      try {
        return JSON.parse(fixed);
      } catch (err2) {
        console.warn("Second GPT fix also invalid, sanitizer:", err2);
        let sanitized = this.sanitizeJSON(raw);
        try {
          return JSON.parse(sanitized);
        } catch (err3) {
          console.error("All attempts failed => returning empty item:", err3);
          return {};
        }
      }
    }
  }

  async generateItemName(prompt) {
    const response = await fetch(`${this.apiUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.selectedModel,
        prompt: `You are an expert in fantasy RPGs. Generate a short item name in plain text. Do not include the word 'dragon' unless explicitly requested. No JSON. User request: ${prompt}`,
        stream: false
      })
    });
    let data = await response.json();
    let name = data.response?.trim() || "Unnamed";
    return this.forceKeywordInName(name, prompt, "");
  }

  // Helper: Force keyword from prompt into the generated name if missing.
  forceKeywordInName(name, prompt, desc = "") {
    const promptLC = prompt.toLowerCase();
    const descLC = desc.toLowerCase();
    let forcedName = name;
    if (promptLC.includes("class change") && !name.toLowerCase().includes("class change")) {
      console.log("Forcing 'Class Change' into item name.");
      forcedName = forcedName + " Class Change";
    }
    for (let keyword of this.keywords) {
      if (promptLC.includes(keyword) && !name.toLowerCase().includes(keyword)) {
        console.log(`Forcing keyword "${keyword}" into name.`);
        forcedName = `${forcedName} ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
      }
    }
    if (!promptLC.includes("dragon") && forcedName.toLowerCase().includes("dragon")) {
      console.log("Removing 'dragon' from item name as it's not in the prompt.");
      forcedName = forcedName.replace(/dragon/gi, "").replace(/\s+/g, " ").trim();
    }
    return forcedName;
  }

  /* --------------------------------
   * New Helper: Refine Item Name Based on Description
   * ------------------------------- */
  async refineItemName(currentName, description) {
    const prompt = `The current item name is: "${currentName}".
The item description is: "${description}".
Please provide a refined, improved item name that better reflects the details and flavor of the description. Output only the name in plain text.`;
    const response = await fetch(`${this.apiUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.selectedModel,
        prompt: `You are an expert in fantasy item naming. ${prompt}`,
        stream: false
      })
    });
    let data = await response.json();
    return data.response?.trim() || currentName;
  }

  /* --------------------------------
   * 4) Consistency Fix: Name vs. JSON
   * ------------------------------- */
  async fixNameDescriptionMismatch(itemName, rawJSON, originalPrompt) {
    let nameLC = itemName.toLowerCase();
    let promptLC = originalPrompt.toLowerCase();
    let parsed;
    try {
      parsed = JSON.parse(rawJSON);
    } catch (e) {
      return rawJSON;
    }
    let desc = parsed.description || "";
    let descLC = desc.toLowerCase();
    const nameRegex = /^<b>\s*Item Name:\s*<\/b>\s*([^<]+)<br\s*\/?>/i;
    const match = desc.match(nameRegex);
    if (match && match[1]) {
      let extractedName = match[1].trim();
      console.log("Extracted name from description:", extractedName);
      parsed.description = desc.replace(nameRegex, "").trim();
      itemName = extractedName;
      nameLC = itemName.toLowerCase();
    }
    if (promptLC.includes("sword")) {
      const unwanted = ["dagger", "helm", "amulet", "staff", "crossbow"];
      for (let term of unwanted) {
        if (nameLC.includes(term)) {
          console.log(`Replacing '${term}' in item name with 'sword'.`);
          itemName = itemName.replace(new RegExp(term, "gi"), "sword");
          nameLC = itemName.toLowerCase();
        }
        if (descLC.includes(term)) {
          console.log(`Replacing '${term}' in item description with 'sword'.`);
          parsed.description = parsed.description.replace(new RegExp(term, "gi"), "sword");
          descLC = parsed.description.toLowerCase();
        }
      }
    }
    return JSON.stringify(parsed);
  }

  async gptFixMismatch(expectedName, foundType, itemName, rawJSON) {
    let prompt =
      "You are a Foundry VTT assistant. The item name or prompt indicates it is a " +
      expectedName +
      ", but the JSON indicates it is a " +
      foundType +
      ". Fix the JSON so that the item is consistent as a " +
      expectedName +
      ". Output only valid JSON. JSON to fix: " + rawJSON;
    const response = await fetch(`${this.apiUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.selectedModel,
        prompt: prompt,
        stream: false
      })
    });
    let data = await response.json();
    let newJSON = data.response?.trim() || rawJSON;
    return newJSON;
  }

  /* --------------------------------
   * New Helper: Generate Multiple Magical Property Descriptions
   * ------------------------------- */
  async generateMagicalProperties(itemData, count) {
    const prompt = `Generate ${count} creative, unique, and flavorful magical property descriptions for the following DnD 5e item. Each description should be a concise sentence describing a special ability or effect that fits the item details. Provide each property on its own line.
    
Item Details:
Name: ${itemData.name}
Type: ${itemData.type}
Rarity: ${itemData.system.rarity}
Weight: ${itemData.system.weight}
Price: ${itemData.system.price.value} ${itemData.system.price.denomination}
Description: ${itemData.system.description.value}

Output only the descriptions, one per line, with no numbering or extra commentary.`;
    
    const response = await fetch(`${this.apiUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.selectedModel,
        prompt: `You are an expert DnD magical property generator. ${prompt}`,
        stream: false
      })
    });
    let data = await response.json();
    return data.response?.trim() || "";
  }
  
  /* --------------------------------
   * New Helper: Generate Active Effects for Magical Properties
   * ------------------------------- */
  async generateActiveEffects(itemData, magicalProperties) {
    if (!magicalProperties) return [];
    
    // Split properties into individual lines
    const properties = magicalProperties.split('\n').filter(p => p.trim().length > 0);
    if (properties.length === 0) return [];
    
    const activeEffects = [];
    
    // Common stat bonuses to look for in magical properties
    const statBonusPatterns = [
      { regex: /\+([1-3])\s+to\s+(strength|str)/i, ability: "str" },
      { regex: /\+([1-3])\s+to\s+(dexterity|dex)/i, ability: "dex" },
      { regex: /\+([1-3])\s+to\s+(constitution|con)/i, ability: "con" },
      { regex: /\+([1-3])\s+to\s+(intelligence|int)/i, ability: "int" },
      { regex: /\+([1-3])\s+to\s+(wisdom|wis)/i, ability: "wis" },
      { regex: /\+([1-3])\s+to\s+(charisma|cha)/i, ability: "cha" },
      { regex: /\+([1-3])\s+to\s+armor\s+class/i, ability: "ac" },
      { regex: /\+([1-3])\s+to\s+(hit|attack)/i, ability: "attack" },
      { regex: /\+([1-3])\s+to\s+(damage|weapon damage)/i, ability: "damage" },
      { regex: /\+([1-3])\s+to\s+(saving throws|saves)/i, ability: "saves" }
    ];
    
    // Process each magical property
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      let effectCreated = false;
      
      // Check for stat bonuses
      for (const pattern of statBonusPatterns) {
        const match = property.match(pattern.regex);
        if (match) {
          const bonus = parseInt(match[1]);
          let effect = {
            label: property,
            icon: "icons/svg/aura.svg",
            origin: itemData._id,
            duration: {
              seconds: null
            },
            disabled: false
          };
          
          // Configure the changes based on the ability
          switch (pattern.ability) {
            case "str":
            case "dex":
            case "con":
            case "int":
            case "wis":
            case "cha":
              effect.changes = [{
                key: `system.abilities.${pattern.ability}.value`,
                mode: 2, // OVERRIDE for simplicity
                value: `@abilities.${pattern.ability}.value + ${bonus}`,
                priority: 20
              }];
              break;
            case "ac":
              effect.changes = [{
                key: "system.attributes.ac.bonus",
                mode: 2,
                value: bonus,
                priority: 20
              }];
              break;
            case "attack":
              effect.changes = [{
                key: "system.bonuses.mwak.attack",
                mode: 2,
                value: bonus,
                priority: 20
              }, {
                key: "system.bonuses.rwak.attack",
                mode: 2,
                value: bonus,
                priority: 20
              }];
              break;
            case "damage":
              effect.changes = [{
                key: "system.bonuses.mwak.damage",
                mode: 2,
                value: bonus,
                priority: 20
              }, {
                key: "system.bonuses.rwak.damage",
                mode: 2,
                value: bonus,
                priority: 20
              }];
              break;
            case "saves":
              effect.changes = [{
                key: "system.bonuses.abilities.save",
                mode: 2,
                value: bonus,
                priority: 20
              }];
              break;
          }
          
          activeEffects.push(effect);
          effectCreated = true;
          break;
        }
      }
      
      // If no specific effect was created, add a generic "description only" effect
      if (!effectCreated) {
        activeEffects.push({
          label: property,
          icon: "icons/svg/aura.svg",
          origin: itemData._id,
          duration: {
            seconds: null
          },
          disabled: false,
          changes: [] // No mechanical changes, just the description
        });
      }
    }
    
    return activeEffects;
  }

  /* --------------------------------
   * 5) Create Unique Item Document (for Roll Table Entries)
   * ------------------------------- */
  async createUniqueItemDoc(itemPrompt, forcedName = null, explicitType = "") {
    let combined = itemPrompt + (explicitType ? " - " + explicitType : "");
    let generatedName = forcedName ? forcedName : await this.generateItemName(combined);
    let imagePath = await this.generateItemImageSilent(combined);
    let rawJson = await this.generateItemJSON(combined, explicitType);
    let fixedJSON = await this.fixNameDescriptionMismatch(generatedName, rawJson, combined);
    let parsed = await this.parseItemJSON(fixedJSON);
    // Transform weapon damage if applicable.
    const weaponKeywords = ["sword", "dagger", "axe", "bow", "mace", "halberd", "flail", "club", "sabre", "blade", "lance", "longbow", "shortbow", "sling", "javelin", "handaxe", "warhammer", "maul", "staff", "katana"];
    if (parsed.damage && (explicitType === "Weapon" || weaponKeywords.some(term => generatedName.toLowerCase().includes(term)))) {
      parsed.damage = this.transformWeaponDamage(parsed.damage);
    }
    this.updateProgressBar(60);
    let finalDesc = parsed.description || "No description provided.";
    let refinedName = await this.refineItemName(generatedName, finalDesc);
    let foundryItemType = "equipment";
    if (explicitType) {
      const explicitMapping = {
        "Weapon": "weapon",
        "Armor": "equipment",
        "Equipment": "equipment",
        "Consumable": "consumable",
        "Tool": "tool",
        "Loot": "loot",
        "Spell": "spell"
      };
      foundryItemType = explicitMapping[explicitType] || "equipment";
    } else {
      if (parsed.itemType) {
        let typeStr = parsed.itemType.toLowerCase();
        const weaponKeywordsAlt = ["sword", "dagger", "axe", "bow", "mace", "halberd", "flail", "club", "sabre", "blade", "lance", "longbow", "shortbow", "sling", "javelin", "handaxe", "warhammer", "maul", "staff", "katana"];
        if (weaponKeywordsAlt.some(term => typeStr.includes(term) || typeStr.includes("weapon"))) {
          foundryItemType = "weapon";
        } else {
          const map = {
            "armor": "equipment",
            "potion": "consumable",
            "scroll": "consumable",
            "rod": "equipment",
            "staff": "equipment",
            "wand": "equipment",
            "ammunition": "consumable",
            "gear": "equipment",
            "loot": "loot",
            "tool": "tool"
          };
          foundryItemType = map[typeStr] || "equipment";
        }
      } else {
        if (weaponKeywords.some(term => generatedName.toLowerCase().includes(term))) {
          foundryItemType = "weapon";
        }
        if (generatedName.toLowerCase().includes("potion")) {
          foundryItemType = "consumable";
        }
        if (foundryItemType === "equipment" && !generatedName.toLowerCase().includes("potion")) {
          const descWeaponKeywords = ["sword", "cutlass", "sabre", "longsword", "rapier", "dagger", "axe", "bow", "mace", "halberd", "flail", "club", "spear", "pike", "scimitar", "quarterstaff", "lance", "longbow", "shortbow", "sling", "javelin", "handaxe", "warhammer", "maul", "katana"];
          if (descWeaponKeywords.some(term => finalDesc.toLowerCase().includes(term))) {
            foundryItemType = "weapon";
          }
        }
      }
    }
    // New: Handle nested type object.
    let newItemType;
    if (parsed.type && typeof parsed.type === "object") {
      newItemType = parsed.type;
    } else {
      if (foundryItemType === "weapon") {
        // Map weapon types to dnd5e system weapon types
        let weaponTypeValue = "simpleM"; // Default to simple melee
        let baseItem = "";
        
        // Determine weapon type based on name and description
        const nameLC = refinedName.toLowerCase();
        const descLC = finalDesc.toLowerCase();
        
        // Check for martial weapons
        const martialWeapons = ["longsword", "greatsword", "rapier", "warhammer", "battleaxe", "glaive", "halberd", "pike", "lance"];
        if (martialWeapons.some(w => nameLC.includes(w) || descLC.includes(w))) {
          weaponTypeValue = "martialM";
        }
        
        // Check for ranged weapons
        const rangedWeapons = ["bow", "crossbow", "sling", "dart", "javelin"];
        if (rangedWeapons.some(w => nameLC.includes(w) || descLC.includes(w))) {
          weaponTypeValue = nameLC.includes("long") || descLC.includes("long") ? "martialR" : "simpleR";
        }
        
        // Determine base item if possible
        const baseItemMap = {
          "longsword": "longsword",
          "shortsword": "shortsword",
          "greatsword": "greatsword",
          "dagger": "dagger",
          "rapier": "rapier",
          "scimitar": "scimitar",
          "handaxe": "handaxe",
          "battleaxe": "battleaxe",
          "greataxe": "greataxe",
          "warhammer": "warhammer",
          "maul": "maul",
          "club": "club",
          "mace": "mace",
          "quarterstaff": "quarterstaff",
          "spear": "spear",
          "javelin": "javelin",
          "longbow": "longbow",
          "shortbow": "shortbow",
          "light crossbow": "lightcrossbow",
          "heavy crossbow": "heavycrossbow",
          "sling": "sling"
        };
        
        for (const [key, value] of Object.entries(baseItemMap)) {
          if (nameLC.includes(key) || descLC.includes(key)) {
            baseItem = value;
            break;
          }
        }
        
        newItemType = { value: weaponTypeValue, baseItem: baseItem };
      } else if (foundryItemType === "equipment") {
        // Map equipment types to dnd5e system equipment types
        let equipmentTypeValue = "trinket"; // Default
        
        // Determine equipment type based on name and description
        const nameLC = refinedName.toLowerCase();
        const descLC = finalDesc.toLowerCase();
        
        if (nameLC.includes("armor") || descLC.includes("armor")) {
          if (nameLC.includes("light") || descLC.includes("light armor")) {
            equipmentTypeValue = "light";
          } else if (nameLC.includes("medium") || descLC.includes("medium armor")) {
            equipmentTypeValue = "medium";
          } else if (nameLC.includes("heavy") || descLC.includes("heavy armor")) {
            equipmentTypeValue = "heavy";
          } else {
            equipmentTypeValue = "medium"; // Default armor type
          }
        } else if (nameLC.includes("shield") || descLC.includes("shield")) {
          equipmentTypeValue = "shield";
        } else if (nameLC.includes("cloak") || nameLC.includes("cape") || descLC.includes("cloak") || descLC.includes("cape")) {
          equipmentTypeValue = "clothing";
        } else if (nameLC.includes("ring") || descLC.includes("ring")) {
          equipmentTypeValue = "trinket";
        } else if (nameLC.includes("amulet") || nameLC.includes("necklace") || descLC.includes("amulet") || descLC.includes("necklace")) {
          equipmentTypeValue = "trinket";
        }
        
        newItemType = { value: equipmentTypeValue };
      } else if (foundryItemType === "consumable") {
        // Map consumable types to dnd5e system consumable types
        let consumableTypeValue = "potion"; // Default
        
        // Determine consumable type based on name and description
        const nameLC = refinedName.toLowerCase();
        const descLC = finalDesc.toLowerCase();
        
        if (nameLC.includes("scroll") || descLC.includes("scroll")) {
          consumableTypeValue = "scroll";
        } else if (nameLC.includes("wand") || descLC.includes("wand")) {
          consumableTypeValue = "wand";
        } else if (nameLC.includes("rod") || descLC.includes("rod")) {
          consumableTypeValue = "rod";
        } else if (nameLC.includes("food") || descLC.includes("food") || nameLC.includes("ration") || descLC.includes("ration")) {
          consumableTypeValue = "food";
        } else if (nameLC.includes("ammunition") || nameLC.includes("arrow") || nameLC.includes("bolt") || 
                  descLC.includes("ammunition") || descLC.includes("arrow") || descLC.includes("bolt")) {
          consumableTypeValue = "ammo";
        }
        
        newItemType = { value: consumableTypeValue };
      } else {
        newItemType = foundryItemType;
      }
    }
    let newItemData = {
      name: refinedName,
      type: foundryItemType,
      img: imagePath || "icons/svg/d20-highlight.svg",
      system: {
        description: { value: finalDesc },
        rarity: parsed.rarity || "common",
        weight: parsed.weight || 1,
        price: { value: parsed.price || 100, denomination: "gp" },
        attunement: parsed.requiresAttunement ? "required" : false,
        armor: { value: 10 },
        properties: [],
        activation: parsed.activation || { type: "", cost: 0 },
        uses: parsed.uses || {},
        damage: foundryItemType === "weapon" ? (parsed.damage ? parsed.damage : { parts: [] }) : (parsed.damage || null),
        type: newItemType  // Nested type inserted here.
      }
    };
    if (foundryItemType === "weapon" && parsed.weaponProperties) {
      let wpProps = this.transformWeaponProperties(parsed.weaponProperties);
      for (let wp of wpProps) {
        newItemData.system.properties.push(wp);
      }
    }
    // Magic fix: Check both "magical" and "magic".
    const isMagic = (
      (parsed.magical !== undefined && String(parsed.magical).toLowerCase() === "true") ||
      (parsed.magic !== undefined && String(parsed.magic).toLowerCase() === "true")
    );
    const magList = ["rare", "very rare", "legendary", "artifact"];
    const rarityLower = (parsed.rarity || "").toLowerCase();
    if (isMagic || (magList.includes(rarityLower) && Math.random() < 0.5)) {
      const count = Math.floor(Math.random() * 3) + 1;
      const magProps = await this.generateMagicalProperties(newItemData, count);
      if (magProps) {
        // Add magical properties to the description
        newItemData.system.description.value += `<br><br><strong>Magical Properties:</strong><br>${magProps.replace(/\n/g, "<br>")}`;        
        
        // Generate and add active effects for the magical properties
        const activeEffects = await this.generateActiveEffects(newItemData, magProps);
        if (activeEffects.length > 0) {
          newItemData.effects = activeEffects;
        }
      }
    }
    if (foundryItemType === "equipment" && parsed.itemType && (parsed.itemType.toLowerCase() === "armor" || parsed.itemType.toLowerCase() === "shield")) {
      let armorType = parsed.armorType || "medium";
      let acValue = parsed.ac || 14;
      
      // Set appropriate dex modifier cap based on armor type
      let dexMod = null;
      if (armorType === "light") {
        dexMod = null; // Light armor has no dex cap
      } else if (armorType === "medium") {
        dexMod = 2; // Medium armor caps dex bonus at +2
      } else if (armorType === "heavy") {
        dexMod = 0; // Heavy armor allows no dex bonus
      }
      
      // Set strength requirement for heavy armor
      let strengthReq = 0;
      if (armorType === "heavy") {
        strengthReq = parsed.strength || 13; // Default strength requirement for heavy armor
      }
      
      newItemData.system.armor = {
        value: acValue,
        type: armorType,
        dex: dexMod
      };
      
      // Add strength requirement if applicable
      if (strengthReq > 0) {
        newItemData.system.strength = strengthReq;
      }
      
      // Set proficiency level to 1 (proficient) by default for armor
      newItemData.system.proficient = 1;
    }
    await Item.create(newItemData);
    this.updateProgressBar(100);
    this.hideProgressBar();
    ui.notifications.info(`New D&D 5e item created: ${refinedName} (Image: ${imagePath})`);
  }

  /* --------------------------------
   * 6) Roll Table Generation Functions
   * ------------------------------- */
  async generateRollTableJSON(userPrompt) {
    const response = await fetch(`${this.apiUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3",
        prompt: "You are a Foundry VTT assistant creating strictly valid JSON for a DnD 5e roll table. " +
              "Output valid JSON with double-quoted property names and no extra commentary or text outside the JSON. " +
              "No disclaimers, no line breaks before or after the JSON object. " +
              "The JSON must include the following fields: 'name', 'formula', 'description', 'tableType', and 'entries'. " +
              "For tables of type 'items', each entry must be an object with 'text', 'minRange', 'maxRange', 'weight', and 'documentCollection' set to 'Item'. " +
              "For generic roll tables, include additional details from the prompt (e.g., city, biome, or theme details) to create tailored, descriptive entries. " +
              "Ensure that the output contains exactly 20 entries. " +
              "Output only the JSON object with no extra commentary. User request: " + userPrompt,
        stream: false
      })
    });
    let data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "{}";
  }

  async parseTableJSON(rawJSON) {
    console.log("Raw Roll Table JSON from GPT:", rawJSON);
    try {
      return JSON.parse(rawJSON);
    } catch (err1) {
      console.warn("Could not parse roll table JSON, second GPT fix:", err1);
      let fixed = await this.fixInvalidJSON(rawJSON);
      try {
        return JSON.parse(fixed);
      } catch (err2) {
        console.warn("Second GPT fix also invalid, sanitizer:", err2);
        let sanitized = this.sanitizeJSON(rawJSON);
        try {
          return JSON.parse(sanitized);
        } catch (err3) {
          console.error("All attempts failed => empty table:", err3);
          return { name: "", formula: "1d20", description: "", tableType: "generic", entries: [] };
        }
      }
    }
  }

  /* --------------------------------
   * 7) Normal Item Flow (Dialog Version)
   * ------------------------------- */
  async createFoundryItemFromDialog(itemType, itemDesc, explicitType) {
    this.showProgressBar();
    this.updateProgressBar(10);
    let combined = `${itemType} - ${itemDesc}` + (explicitType ? " - " + explicitType : "");
    let generatedName = await this.generateItemName(combined);
    const weaponKeywords = ["sword", "dagger", "axe", "bow", "mace", "halberd", "flail", "club", "sabre", "blade", "lance", "longbow", "shortbow", "sling", "javelin", "handaxe", "warhammer", "maul", "staff", "katana"];
    let imagePath = await this.generateItemImageSilent(combined);
    this.updateProgressBar(20);
    let rawItemJSON = await this.generateItemJSON(combined, explicitType);
    this.updateProgressBar(40);
    let fixedJSON = await this.fixNameDescriptionMismatch(generatedName, rawItemJSON, combined);
    let parsed = await this.parseItemJSON(fixedJSON);
    if (parsed.damage && (explicitType === "Weapon" || weaponKeywords.some(term => generatedName.toLowerCase().includes(term)))) {
      parsed.damage = this.transformWeaponDamage(parsed.damage);
    }
    this.updateProgressBar(60);
    let finalDesc = parsed.description || "No description provided.";
    let refinedName = await this.refineItemName(generatedName, finalDesc);
    let foundryItemType = "equipment";
    if (explicitType) {
      const explicitMapping = {
        "Weapon": "weapon",
        "Armor": "equipment",
        "Equipment": "equipment",
        "Consumable": "consumable",
        "Tool": "tool",
        "Loot": "loot",
        "Spell": "spell"
      };
      foundryItemType = explicitMapping[explicitType] || "equipment";
    } else {
      if (parsed.itemType) {
        let typeStr = parsed.itemType.toLowerCase();
        const weaponKeywordsAlt = ["sword", "dagger", "axe", "bow", "mace", "halberd", "flail", "club", "sabre", "blade", "lance", "longbow", "shortbow", "sling", "javelin", "handaxe", "warhammer", "maul", "staff", "katana"];
        if (weaponKeywordsAlt.some(term => typeStr.includes(term) || typeStr.includes("weapon"))) {
          foundryItemType = "weapon";
        } else {
          const map = {
            "armor": "equipment",
            "potion": "consumable",
            "scroll": "consumable",
            "rod": "equipment",
            "staff": "equipment",
            "wand": "equipment",
            "ammunition": "consumable",
            "gear": "equipment",
            "loot": "loot",
            "tool": "tool"
          };
          foundryItemType = map[typeStr] || "equipment";
        }
      } else {
        if (weaponKeywords.some(term => generatedName.toLowerCase().includes(term))) {
          foundryItemType = "weapon";
        }
        if (generatedName.toLowerCase().includes("potion")) {
          foundryItemType = "consumable";
        }
        if (foundryItemType === "equipment" && !generatedName.toLowerCase().includes("potion")) {
          const descWeaponKeywords = ["sword", "cutlass", "sabre", "longsword", "rapier", "dagger", "axe", "bow", "mace", "halberd", "flail", "club", "spear", "pike", "scimitar", "quarterstaff", "lance", "longbow", "shortbow", "sling", "javelin", "handaxe", "warhammer", "maul", "katana"];
          if (descWeaponKeywords.some(term => finalDesc.toLowerCase().includes(term))) {
            foundryItemType = "weapon";
          }
        }
      }
    }
    // New: Handle nested type object.
    let newItemType;
    if (parsed.type && typeof parsed.type === "object") {
      newItemType = parsed.type;
    } else {
      if (foundryItemType === "weapon") {
        // Map weapon types to dnd5e system weapon types
        let weaponTypeValue = "simpleM"; // Default to simple melee
        let baseItem = "";
        
        // Determine weapon type based on name and description
        const nameLC = refinedName.toLowerCase();
        const descLC = finalDesc.toLowerCase();
        
        // Check for martial weapons
        const martialWeapons = ["longsword", "greatsword", "rapier", "warhammer", "battleaxe", "glaive", "halberd", "pike", "lance"];
        if (martialWeapons.some(w => nameLC.includes(w) || descLC.includes(w))) {
          weaponTypeValue = "martialM";
        }
        
        // Check for ranged weapons
        const rangedWeapons = ["bow", "crossbow", "sling", "dart", "javelin"];
        if (rangedWeapons.some(w => nameLC.includes(w) || descLC.includes(w))) {
          weaponTypeValue = nameLC.includes("long") || descLC.includes("long") ? "martialR" : "simpleR";
        }
        
        // Determine base item if possible
        const baseItemMap = {
          "longsword": "longsword",
          "shortsword": "shortsword",
          "greatsword": "greatsword",
          "dagger": "dagger",
          "rapier": "rapier",
          "scimitar": "scimitar",
          "handaxe": "handaxe",
          "battleaxe": "battleaxe",
          "greataxe": "greataxe",
          "warhammer": "warhammer",
          "maul": "maul",
          "club": "club",
          "mace": "mace",
          "quarterstaff": "quarterstaff",
          "spear": "spear",
          "javelin": "javelin",
          "longbow": "longbow",
          "shortbow": "shortbow",
          "light crossbow": "lightcrossbow",
          "heavy crossbow": "heavycrossbow",
          "sling": "sling"
        };
        
        for (const [key, value] of Object.entries(baseItemMap)) {
          if (nameLC.includes(key) || descLC.includes(key)) {
            baseItem = value;
            break;
          }
        }
        
        newItemType = { value: weaponTypeValue, baseItem: baseItem };
      } else if (foundryItemType === "equipment") {
        // Map equipment types to dnd5e system equipment types
        let equipmentTypeValue = "trinket"; // Default
        
        // Determine equipment type based on name and description
        const nameLC = refinedName.toLowerCase();
        const descLC = finalDesc.toLowerCase();
        
        if (nameLC.includes("armor") || descLC.includes("armor")) {
          if (nameLC.includes("light") || descLC.includes("light armor")) {
            equipmentTypeValue = "light";
          } else if (nameLC.includes("medium") || descLC.includes("medium armor")) {
            equipmentTypeValue = "medium";
          } else if (nameLC.includes("heavy") || descLC.includes("heavy armor")) {
            equipmentTypeValue = "heavy";
          } else {
            equipmentTypeValue = "medium"; // Default armor type
          }
        } else if (nameLC.includes("shield") || descLC.includes("shield")) {
          equipmentTypeValue = "shield";
        } else if (nameLC.includes("cloak") || nameLC.includes("cape") || descLC.includes("cloak") || descLC.includes("cape")) {
          equipmentTypeValue = "clothing";
        } else if (nameLC.includes("ring") || descLC.includes("ring")) {
          equipmentTypeValue = "trinket";
        } else if (nameLC.includes("amulet") || nameLC.includes("necklace") || descLC.includes("amulet") || descLC.includes("necklace")) {
          equipmentTypeValue = "trinket";
        }
        
        newItemType = { value: equipmentTypeValue };
      } else if (foundryItemType === "consumable") {
        // Map consumable types to dnd5e system consumable types
        let consumableTypeValue = "potion"; // Default
        
        // Determine consumable type based on name and description
        const nameLC = refinedName.toLowerCase();
        const descLC = finalDesc.toLowerCase();
        
        if (nameLC.includes("scroll") || descLC.includes("scroll")) {
          consumableTypeValue = "scroll";
        } else if (nameLC.includes("wand") || descLC.includes("wand")) {
          consumableTypeValue = "wand";
        } else if (nameLC.includes("rod") || descLC.includes("rod")) {
          consumableTypeValue = "rod";
        } else if (nameLC.includes("food") || descLC.includes("food") || nameLC.includes("ration") || descLC.includes("ration")) {
          consumableTypeValue = "food";
        } else if (nameLC.includes("ammunition") || nameLC.includes("arrow") || nameLC.includes("bolt") || 
                  descLC.includes("ammunition") || descLC.includes("arrow") || descLC.includes("bolt")) {
          consumableTypeValue = "ammo";
        }
        
        newItemType = { value: consumableTypeValue };
      } else {
        newItemType = foundryItemType;
      }
    }
    let newItemData = {
      name: refinedName,
      type: foundryItemType,
      img: imagePath || "icons/svg/d20-highlight.svg",
      system: {
        description: { value: finalDesc },
        rarity: parsed.rarity || "common",
        weight: parsed.weight || 1,
        price: { value: parsed.price || 100, denomination: "gp" },
        attunement: parsed.requiresAttunement ? "required" : false,
        armor: { value: 10 },
        properties: [],
        activation: parsed.activation || { type: "", cost: 0 },
        uses: parsed.uses || {},
        damage: foundryItemType === "weapon" ? (parsed.damage ? parsed.damage : { parts: [] }) : (parsed.damage || null),
        type: newItemType  // Nested type information inserted here.
      }
    };
    if (foundryItemType === "weapon" && parsed.weaponProperties) {
      let wpProps = this.transformWeaponProperties(parsed.weaponProperties);
      for (let wp of wpProps) {
        newItemData.system.properties.push(wp);
      }
    }
    // Magic fix: Check both "magical" and "magic".
    const isMagic = (
      (parsed.magical !== undefined && String(parsed.magical).toLowerCase() === "true") ||
      (parsed.magic !== undefined && String(parsed.magic).toLowerCase() === "true")
    );
    const magList = ["rare", "very rare", "legendary", "artifact"];
    const rarityLower = (parsed.rarity || "").toLowerCase();
    if (isMagic || (magList.includes(rarityLower) && Math.random() < 0.5)) {
      const count = Math.floor(Math.random() * 3) + 1;
      const magProps = await this.generateMagicalProperties(newItemData, count);
      if (magProps) {
        // Add magical properties to the description
        newItemData.system.description.value += `<br><br><strong>Magical Properties:</strong><br>${magProps.replace(/\n/g, "<br>")}`;        
        
        // Generate and add active effects for the magical properties
        const activeEffects = await this.generateActiveEffects(newItemData, magProps);
        if (activeEffects.length > 0) {
          newItemData.effects = activeEffects;
        }
      }
    }
    if (foundryItemType === "equipment" && parsed.itemType && (parsed.itemType.toLowerCase() === "armor" || parsed.itemType.toLowerCase() === "shield")) {
      let armorType = parsed.armorType || "medium";
      let acValue = parsed.ac || 14;
      
      // Set appropriate dex modifier cap based on armor type
      let dexMod = null;
      if (armorType === "light") {
        dexMod = null; // Light armor has no dex cap
      } else if (armorType === "medium") {
        dexMod = 2; // Medium armor caps dex bonus at +2
      } else if (armorType === "heavy") {
        dexMod = 0; // Heavy armor allows no dex bonus
      }
      
      // Set strength requirement for heavy armor
      let strengthReq = 0;
      if (armorType === "heavy") {
        strengthReq = parsed.strength || 13; // Default strength requirement for heavy armor
      }
      
      newItemData.system.armor = {
        value: acValue,
        type: armorType,
        dex: dexMod
      };
      
      // Add strength requirement if applicable
      if (strengthReq > 0) {
        newItemData.system.strength = strengthReq;
      }
      
      // Set proficiency level to 1 (proficient) by default for armor
      newItemData.system.proficient = 1;
    }
    await Item.create(newItemData);
    this.updateProgressBar(100);
    this.hideProgressBar();
    ui.notifications.info(`New D&D 5e item created: ${refinedName} (Image: ${imagePath})`);
  }

  /* --------------------------------
   * 6) Roll Table Flow (Dialog Version)
   * ------------------------------- */
  async createFoundryRollTableFromDialog(tableDesc, explicitType) {
    this.showProgressBar();
    this.updateProgressBar(10);
    let rawTableJSON = await this.generateRollTableJSON(tableDesc);
    this.updateProgressBar(30);
    let parsedTable = await this.parseTableJSON(rawTableJSON);
    this.updateProgressBar(50);
    let newTable = await RollTable.create({
      name: parsedTable.name || tableDesc || "GPT Roll Table",
      formula: parsedTable.formula || "1d20",
      description: parsedTable.description || "",
      replacement: true
    });
    let results = [];
    let tableType = (parsedTable.tableType || "generic").toLowerCase();
    ui.notifications.info(`Building table with ${parsedTable.entries?.length || 0} entries, tableType = ${tableType}.`);
    if (tableType === "items") {
      for (let entry of (parsedTable.entries || [])) {
        let textVal = entry.text || "Mysterious Item";
        let createdItem = await this.createUniqueItemDoc(textVal, textVal, explicitType);
        if (createdItem && createdItem.name) {
          results.push({
            type: 1,
            text: createdItem.name,
            range: [entry.minRange ?? 1, entry.maxRange ?? 1],
            weight: entry.weight ?? 1,
            img: "icons/svg/d20-highlight.svg",
            documentCollection: "Item",
            documentId: createdItem.id,
            drawn: false
          });
        } else {
          results.push({
            type: 0,
            text: `Failed item: ${textVal}`,
            range: [entry.minRange ?? 1, entry.maxRange ?? 1],
            weight: entry.weight ?? 1,
            img: "icons/svg/d20-highlight.svg",
            documentCollection: "Item",
            drawn: false
          });
        }
      }
    } else {
      for (let entry of (parsedTable.entries || [])) {
        results.push({
          type: 0,
          text: entry.text || "No text",
          range: [entry.minRange ?? 1, entry.maxRange ?? 1],
          weight: entry.weight ?? 1,
          img: "icons/svg/d20-highlight.svg",
          documentCollection: "Item",
          drawn: false
        });
      }
    }
    if (!results.length) {
      ui.notifications.warn("GPT returned no entries. Table is empty.");
    }
    await newTable.createEmbeddedDocuments("TableResult", results);
    this.updateProgressBar(100);
    this.hideProgressBar();
    ui.notifications.info(`New Roll Table created: ${newTable.name}`);
  }

  /* --------------------------------
   * 7) Unified Dialog Entry Point
   * ------------------------------- */
  async openGenerateDialog() {
    new Dialog({
      title: "Generate AI Object",
      content: `
        <form>
          <div class="form-group">
            <label>Generate:</label>
            <select id="ai-object-type" style="width: 100%;">
              <option value="item">Item</option>
              <option value="rolltable">Roll Table</option>
            </select>
          </div>
          <div class="form-group" id="explicit-type-group">
            <label>Explicit Item Type:</label>
            <select id="ai-explicit-type" style="width: 100%;">
              <option value="Weapon">Weapon</option>
              <option value="Armor">Armor</option>
              <option value="Equipment">Equipment</option>
              <option value="Consumable">Consumable</option>
              <option value="Tool">Tool</option>
              <option value="Loot">Loot</option>
              <option value="Spell">Spell</option>
            </select>
          </div>
          <div class="form-group" id="table-type-group" style="display: none;">
            <label>Roll Table Mode:</label>
            <select id="ai-table-type" style="width: 100%;">
              <option value="items">Items</option>
              <option value="generic">Generic</option>
            </select>
          </div>
          <div class="form-group">
            <label>Description (or Prompt):</label>
            <input id="ai-description" type="text" style="width: 100%;" />
          </div>
        </form>
      `,
      buttons: {
        generate: {
          label: "Generate",
          callback: async (html) => {
            const objectType = html.find("#ai-object-type").val();
            const desc = html.find("#ai-description").val();
            const explicitType = html.find("#ai-explicit-type").val();
            if (!desc) return ui.notifications.error("Description is required");

            if (objectType === "rolltable") {
              const tableMode = html.find("#ai-table-type").val();
              await this.createFoundryRollTableFromDialog(`${desc} -- tableType=${tableMode}`, explicitType);
            } else {
              await this.createFoundryItemFromDialog(desc, "", explicitType);
            }
          }
        },
        cancel: { label: "Cancel" }
      },
      default: "generate",
      render: html => {
        html.closest('.dialog').css({'height': 'auto', 'max-height': 'none'});
        const updateVisibility = () => {
          const objectType = html.find("#ai-object-type").val();
          const tableMode = html.find("#ai-table-type").val();
          if (objectType === "rolltable") {
            html.find("#table-type-group").show();
          } else {
            html.find("#table-type-group").hide();
          }
          if (objectType === "item" || (objectType === "rolltable" && tableMode === "items")) {
            html.find("#explicit-type-group").show();
          } else {
            html.find("#explicit-type-group").hide();
          }
        };
        updateVisibility();
        html.find("#ai-object-type").on("change", () => updateVisibility());
        html.find("#ai-table-type").on("change", () => updateVisibility());
      }
    }).render(true);
  }

  /* --------------------------------
   * 8) Unified Entry Point (Legacy)
   * ------------------------------- */
  async createFoundryAIObject() {
    await this.openGenerateDialog();
  }

  /* --------------------------------
   * Ollama Connection and Model Management
   * ------------------------------- */
  async verifyOllamaConnection() {
    try {
      ui.notifications.info("Testing connection to Ollama server...");
      
      // First check if the server is reachable
      const pingResponse = await fetch(`${this.apiUrl}/api/version`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      }).catch(error => {
        console.error("Error connecting to Ollama server:", error);
        return { ok: false, error };
      });
      
      if (!pingResponse.ok) {
        game.settings.set("chatgpt-item-generator", "verifyOllamaConnection", "Failed");
        ui.notifications.error("Failed to connect to Ollama server. Check your API URL.");
        return false;
      }
      
      // Now fetch available models
      const modelResponse = await fetch(`${this.apiUrl}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (modelResponse.ok) {
        const data = await modelResponse.json();
        if (data && data.models) {
          // Store available models
          this.availableModels = data.models.map(model => ({
            id: model.name,
            name: model.name
          }));
          
          // Update the settings with available models
          const modelChoices = {};
          this.availableModels.forEach(model => {
            modelChoices[model.id] = model.name;
          });
          
          // If no models found, keep default choices
          if (Object.keys(modelChoices).length > 0) {
            // Update the setting choices
            const setting = game.settings.settings.get("chatgpt-item-generator.selectedModel");
            if (setting) {
              setting.choices = modelChoices;
            }
            
            // If current selected model is not in the list, select the first available
            if (!modelChoices[this.selectedModel] && Object.keys(modelChoices).length > 0) {
              this.selectedModel = Object.keys(modelChoices)[0];
              game.settings.set("chatgpt-item-generator", "selectedModel", this.selectedModel);
            }
          }
          
          game.settings.set("chatgpt-item-generator", "verifyOllamaConnection", "Verified");
          ui.notifications.info(`Successfully connected to Ollama server. Found ${this.availableModels.length} models.`);
          return true;
        } else {
          game.settings.set("chatgpt-item-generator", "verifyOllamaConnection", "Failed");
          ui.notifications.error("Connected to Ollama server but no models were found.");
          return false;
        }
      } else {
        game.settings.set("chatgpt-item-generator", "verifyOllamaConnection", "Failed");
        ui.notifications.error("Failed to fetch models from Ollama server.");
        return false;
      }
    } catch (error) {
      console.error("Error verifying Ollama connection:", error);
      game.settings.set("chatgpt-item-generator", "verifyOllamaConnection", "Failed");
      ui.notifications.error(`Failed to connect to Ollama server: ${error.message}`);
      return false;
    }
  }
  
  /* --------------------------------
   * Check if image generation is possible
   * ------------------------------- */
  async checkImageGenerationCapability() {
    if (!this.enableImageGeneration) {
      return false;
    }
    
    if (!this.stableDiffusionUrl) {
      ui.notifications.warn("Image generation is enabled but no Stable Diffusion URL is set.");
      return false;
    }
    
    try {
      // Simple ping to check if the Stable Diffusion server is reachable
      const response = await fetch(this.stableDiffusionUrl, {
        method: "HEAD"
      }).catch(error => {
        console.error("Error connecting to Stable Diffusion server:", error);
        return { ok: false, error };
      });
      
      if (!response.ok) {
        ui.notifications.warn("Could not connect to Stable Diffusion server. Image generation may not work.");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking Stable Diffusion connection:", error);
      ui.notifications.warn("Error checking Stable Diffusion connection. Image generation may not work.");
      return false;
    }
  }
}

// Dialog class for verifying Ollama connection
class VerifyOllamaConnectionDialog extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "verify-ollama-connection",
      title: "Verify Ollama Connection",
      template: "templates/apps/form-application.html",
      width: 400,
      submitOnChange: false,
      closeOnSubmit: true
    });
  }
  
  getData() {
    return {
      content: `<p>Click the button below to verify your connection to Ollama and fetch available models.</p>
               <p>Current status: <strong>${game.settings.get("chatgpt-item-generator", "verifyOllamaConnection")}</strong></p>
               <p>Current API URL: <strong>${game.chatGPTItemGenerator?.apiUrl || "Not set"}</strong></p>
               <p>Current model: <strong>${game.chatGPTItemGenerator?.selectedModel || "Not set"}</strong></p>
               <p>Image generation: <strong>${game.chatGPTItemGenerator?.enableImageGeneration ? "Enabled" : "Disabled"}</strong></p>`
    };
  }
  
  async _updateObject(event, formData) {
    await game.chatGPTItemGenerator.verifyOllamaConnection();
    if (game.chatGPTItemGenerator.enableImageGeneration) {
      await game.chatGPTItemGenerator.checkImageGenerationCapability();
    }
  }
}

// Initialize settings and module
Hooks.once("init", () => {
  ChatGPTItemGenerator.registerSettings();
});

Hooks.once("ready", async () => {
  game.chatGPTItemGenerator = new ChatGPTItemGenerator();
  console.log("ChatGPT Item Generator Loaded");
  
  // Verify Ollama connection on startup
  await game.chatGPTItemGenerator.verifyOllamaConnection();
  
  // Check image generation capability if enabled
  if (game.chatGPTItemGenerator.enableImageGeneration) {
    await game.chatGPTItemGenerator.checkImageGenerationCapability();
  }
});

// Add the Generate button to the footer of the Items directory (only show to GMs)
Hooks.on("renderItemDirectory", (app, html, data) => {
  if (game.user.isGM) {
    let button = $(`<button><i class='fas fa-magic'></i> Generate AI (Item or RollTable)</button>`);
    button.click(() => game.chatGPTItemGenerator.createFoundryAIObject());
    html.find(".directory-footer").first().append(button);
  }
});
