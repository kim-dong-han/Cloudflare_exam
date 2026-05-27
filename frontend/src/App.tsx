import { useState } from 'react'
import './App.css'

interface SummonerData {
  name: string;
  profileIconId: number;
  summonerLevel: number;
  puuid: string;
  account: {
    gameName: string;
    tagLine: string;
  };
  league: any[];
}

interface MatchData {
  metadata: {
    matchId: string;
  };
  info: {
    gameMode: string;
    participants: any[];
  };
}

const WORKER_URL = import.meta.env.VITE_WORKER_URL || ''; // Set via environment variable during build

function App() {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [summoner, setSummoner] = useState<SummonerData | null>(null)
  const [matches, setMatches] = useState<MatchData[]>([])

  const handleSearch = async () => {
    if (!search.includes('#')) {
      alert('Please enter Name#Tag (e.g., Hide on bush#KR1)')
      return
    }

    setLoading(true)
    const [name, tag] = search.split('#')
    
    try {
      const summonerRes = await fetch(`${WORKER_URL}/api/summoner/${name}/${tag}`)
      const summonerData = await summonerRes.json()
      setSummoner(summonerData)

      const matchesRes = await fetch(`${WORKER_URL}/api/matches/${summonerData.puuid}`)
      const matchesData = await matchesRes.json()
      setMatches(matchesData)
    } catch (error) {
      console.error('Search failed:', error)
      alert('Failed to fetch data. Check console or API key.')
    } finally {
      setLoading(false)
    }
  }

  const getRankInfo = () => {
    if (!summoner?.league || summoner.league.length === 0) return 'Unranked'
    const solo = summoner.league.find((l: any) => l.queueType === 'RANKED_SOLO_5x5')
    return solo ? `${solo.tier} ${solo.rank}` : 'Unranked'
  }

  return (
    <div className="container">
      <h1>LoL Match History</h1>
      
      <div className="search-section">
        <input 
          type="text" 
          placeholder="Game Name #Tag" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {summoner && (
        <div className="summoner-profile">
          <img 
            className="profile-icon"
            src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/${summoner.profileIconId}.png`} 
            alt="Icon" 
          />
          <div>
            <h2>{summoner.account.gameName} #{summoner.account.tagLine}</h2>
            <p>Level: {summoner.summonerLevel} | Rank: {getRankInfo()}</p>
          </div>
        </div>
      )}

      <div className="match-list">
        {matches.map((match) => {
          const me = match.info.participants.find(p => p.puuid === summoner?.puuid)
          if (!me) return null;

          return (
            <div key={match.metadata.matchId} className={`match-card ${me.win ? 'win' : 'loss'}`}>
              <img 
                src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/${me.championName}.png`} 
                alt={me.championName} 
              />
              <div className="kda">
                <div>{me.win ? 'Victory' : 'Defeat'}</div>
                <div>{me.kills} / {me.deaths} / {me.assists}</div>
              </div>
              <div className="stats">
                <div>{me.championName}</div>
                <div>CS {me.totalMinionsKilled + me.neutralMinionsKilled}</div>
              </div>
              <div className="items">
                {[me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6].map((id, idx) => (
                  id !== 0 ? (
                    <img 
                      key={idx}
                      className="item-icon"
                      src={`https://ddragon.leagueoflegends.com/cdn/14.10.1/img/item/${id}.png`}
                      alt="item"
                    />
                  ) : <div key={idx} className="item-icon"></div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App
