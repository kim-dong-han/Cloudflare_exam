interface Env {
  RIOT_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path.startsWith("/api/summoner/")) {
        const parts = path.split("/");
        const gameName = parts[3];
        const tagLine = parts[4];

        if (!gameName || !tagLine) {
          return new Response("Missing gameName or tagLine", { status: 400, headers: corsHeaders });
        }

        // 1. Account-v1: Get PUUID
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${env.RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        if (!accountRes.ok) return accountRes;
        const accountData: any = await accountRes.json();
        const puuid = accountData.puuid;

        // 2. Summoner-v4: Get summoner details (profileIconId, level, id)
        const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${env.RIOT_API_KEY}`;
        const summonerRes = await fetch(summonerUrl);
        if (!summonerRes.ok) return summonerRes;
        const summonerData: any = await summonerRes.json();

        // 3. League-v4: Get rank info
        const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerData.id}?api_key=${env.RIOT_API_KEY}`;
        const leagueRes = await fetch(leagueUrl);
        const leagueData = await leagueRes.json();

        return new Response(JSON.stringify({ ...summonerData, account: accountData, league: leagueData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (path.startsWith("/api/matches/")) {
        const puuid = path.split("/")[3];
        if (!puuid) return new Response("Missing PUUID", { status: 400, headers: corsHeaders });

        // Get match IDs
        const matchIdsUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10&api_key=${env.RIOT_API_KEY}`;
        const matchIdsRes = await fetch(matchIdsUrl);
        if (!matchIdsRes.ok) return matchIdsRes;
        const matchIds: string[] = await matchIdsRes.json();

        // Fetch details for each match
        const matchDetails = await Promise.all(
          matchIds.map(async (id) => {
            const detailUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${env.RIOT_API_KEY}`;
            const detailRes = await fetch(detailUrl);
            return detailRes.json();
          })
        );

        return new Response(JSON.stringify(matchDetails), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
