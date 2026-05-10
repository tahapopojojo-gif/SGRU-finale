/**
 * AI Service for UrbanMap Maroc
 * Handles citizen opinion analysis using Anthropic Claude
 */

const analyzeOpinion = async (opinionText) => {
  // 1. If opinionText is null, empty string, or whitespace only
  if (!opinionText || !opinionText.trim()) {
    return { relevant: false, reason: 'empty', cleaned_text: null };
  }

  // Exact prompt template as requested
  const prompt = `Tu es un modérateur pour une plateforme d'urbanisme au Maroc.
Analyse ce commentaire d'un citoyen :

"${opinionText}"

Réponds UNIQUEMENT en JSON valide, sans backticks, sans explication :
{
  "relevant": true ou false,
  "reason": "explication courte en français",
  "cleaned_text": "texte reformulé proprement si pertinent, sinon null"
}

Un commentaire est pertinent s'il parle de besoins urbains (infrastructure, équipements, espaces verts, voirie, logement, transport, patrimoine).
Il est non pertinent s'il est politique, offensant, hors-sujet ou sans rapport avec l'urbanisme.
Accepte le français, l'arabe, et le darija marocain.`;

  try {
    // 2. Call the Anthropic API via proxy
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Authentication headers are injected by the proxy
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // 3. Parse the response
    // Extract text from content array
    let rawText = data.content[0].text;

    // Strip markdown backticks if present (e.g., ```json ... ```)
    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Parse the cleaned JSON string
    const result = JSON.parse(cleanedJson);

    return {
      relevant: result.relevant,
      reason: result.reason,
      cleaned_text: result.cleaned_text
    };

  } catch (error) {
    // 4. Error handling with safe fallback
    console.error("AI Analysis Failed:", error);
    return { 
      relevant: true, 
      reason: 'ai_unavailable', 
      cleaned_text: opinionText 
    };
  }
};

const generateZoneSummary = async (opinions, zoneName) => {
  // 1. If opinions array is empty or null → return null immediately
  if (!opinions || opinions.length === 0) {
    return null;
  }

  const generateFallback = () => {
    const total = opinions.length;
    let urgSum = 0;
    const catCounts = {};
    
    opinions.forEach(o => {
      urgSum += o.urgency;
      const cat = o.categorie || 'autre';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const avgUrgency = (urgSum / total).toFixed(1);
    let urgencyText = "un besoin modéré";
    if (avgUrgency >= 4) urgencyText = "une urgence élevée";
    else if (avgUrgency >= 2.5) urgencyText = "une situation préoccupante";

    const catLabels = {
      hopital: "équipements de santé", 
      ecole: "infrastructures scolaires",
      parc: "espaces verts", 
      route: "voirie et transport", 
      autre: "autres besoins urbains"
    };

    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    
    const cat1 = sortedCats[0];
    const cat1Label = catLabels[cat1[0]] || "autres besoins urbains";
    const cat1Pct = Math.round((cat1[1] / total) * 100);

    let summary = `Les citoyens de ${zoneName} expriment principalement des besoins en ${cat1Label} (${cat1Pct}% des signalements)`;

    if (sortedCats.length > 1) {
      const cat2 = sortedCats[1];
      const cat2Label = catLabels[cat2[0]] || "autres besoins urbains";
      const cat2Pct = Math.round((cat2[1] / total) * 100);
      summary += `, suivis de ${cat2Label} (${cat2Pct}%)`;
    }

    summary += `. Le niveau d'urgence moyen est de ${avgUrgency}/5, reflétant ${urgencyText} d'intervention urbaine.`;
    return summary;
  };

  // Max 20 opinions
  const limitedOpinions = opinions.slice(0, 20);
  const opinionsList = limitedOpinions.map((o, index) => `${index + 1}. ${o.opinion}`).join('\n');

  const prompt = `Voici ${limitedOpinions.length} opinions de citoyens de la zone ${zoneName} à Marrakech.

${opinionsList}

Génère un résumé analytique de 2-3 phrases qui identifie :
- Les besoins urbains principaux exprimés
- Leur fréquence relative (ex: 60% parlent de voirie)
- Le niveau d'urgence général perçu

Réponds uniquement avec le texte du résumé, sans titre, sans bullet points, sans formatage markdown.`;

  try {
    const fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Anthropic API returned status ${res.status}`);
      const data = await res.json();
      return data.content[0].text.trim();
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6000));

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Zone Summary Generation Failed, using fallback:", error);
    return generateFallback();
  }
};

export { analyzeOpinion, generateZoneSummary };
