/**
 * AI Service for UrbanMap Maroc
 * Handles citizen opinion analysis using Google Gemini
 */

const GEMINI_API_KEY = "AIzaSyB300WEtSkFTEaR5ulKHtMzv4_zxEvhmv8";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const callGemini = async (prompt) => {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) throw new Error(`Gemini API returned status ${response.status}`);
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
};

const analyzeOpinion = async (opinionText) => {
  if (!opinionText || !opinionText.trim()) {
    return { relevant: false, reason: 'empty', cleaned_text: null };
  }

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
    let rawText = await callGemini(prompt);
    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedJson);
    return {
      relevant: result.relevant,
      reason: result.reason,
      cleaned_text: result.cleaned_text
    };
  } catch (error) {
    console.error("AI Analysis Failed:", error);
    return { relevant: true, reason: 'ai_unavailable', cleaned_text: opinionText };
  }
};

const generateZoneSummary = async (opinions, zoneName) => {
  if (!opinions || opinions.length === 0) return null;

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
    const fetchPromise = callGemini(prompt);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6000));
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Zone Summary Generation Failed, using fallback:", error);
    return generateFallback();
  }
};

export { analyzeOpinion, generateZoneSummary };
