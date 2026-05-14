function fuzzyMatch(query, candidates, maxResults = 10) {
  if (!query) return candidates.slice(0, maxResults).map(c => ({ item: c, score: 0 }));

  const queryLower = query.toLowerCase();
  const results = [];

  for (const candidate of candidates) {
    const score = fuzzyScore(queryLower, candidate.toLowerCase(), candidate);
    if (score > 0) {
      results.push({ item: candidate, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

function fuzzyScore(query, candidateLower, candidateOriginal) {
  let score = 0;
  let queryIdx = 0;
  let prevMatchIdx = -1;
  let consecutiveBonus = 0;

  for (let i = 0; i < candidateLower.length && queryIdx < query.length; i++) {
    if (candidateLower[i] === query[queryIdx]) {
      score += 1;

      // Consecutive match bonus
      if (prevMatchIdx === i - 1) {
        consecutiveBonus += 2;
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }

      // Word boundary bonus (after /, ., -, _)
      if (i === 0 || '/.-_'.includes(candidateLower[i - 1])) {
        score += 5;
      }

      // Camel case boundary bonus
      if (i > 0 && candidateOriginal[i] === candidateOriginal[i].toUpperCase() &&
          candidateOriginal[i - 1] === candidateOriginal[i - 1].toLowerCase()) {
        score += 3;
      }

      prevMatchIdx = i;
      queryIdx++;
    }
  }

  // All query characters must match
  if (queryIdx < query.length) return 0;

  // Bonus for shorter candidates (more specific matches)
  score += Math.max(0, 20 - candidateLower.length) * 0.5;

  // Exact filename match bonus
  const filename = candidateLower.split('/').pop();
  if (filename === query) score += 50;
  if (filename.startsWith(query)) score += 20;

  return score;
}
