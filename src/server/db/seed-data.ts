export interface DemoBeat {
  title: string;
  genre: string;
  language: string;
  bpm: number;
  key: string;
  moods: string[];
  tags: string[];
  nonExclusivePaise: number;
  exclusivePaise: number;
  freeLicense: boolean;
  featured: boolean;
  plays: number;
}

export const demoProducer = {
  email: "producer@astrylix.test",
  accountName: "Astrylix",
  displayName: "Astrylix",
  slug: "astrylix",
  bio: "Demo profile for local development. Replace with the real producer biography before launch.",
  location: { country: "India", state: "Maharashtra", city: "Mumbai" },
};

export const demoBeats: DemoBeat[] = [
  { title: "Midnight Circuit", genre: "Trap", language: "Instrumental", bpm: 140, key: "F# Minor", moods: ["dark", "aggressive"], tags: ["travis scott type beat", "dark trap"], nonExclusivePaise: 79900, exclusivePaise: 799900, freeLicense: true, featured: true, plays: 1840 },
  { title: "Neon Rain", genre: "Lo-fi", language: "Instrumental", bpm: 78, key: "D Major", moods: ["chill", "dreamy"], tags: ["lofi type beat", "study beats"], nonExclusivePaise: 49900, exclusivePaise: 499900, freeLicense: true, featured: true, plays: 1320 },
  { title: "Mumbai Nights", genre: "Hip Hop", language: "Hindi", bpm: 92, key: "A Minor", moods: ["gritty", "street"], tags: ["divine type beat", "desi hip hop"], nonExclusivePaise: 69900, exclusivePaise: 699900, freeLicense: true, featured: true, plays: 2210 },
  { title: "Bass Temple", genre: "Drill", language: "Instrumental", bpm: 144, key: "C Minor", moods: ["menacing", "dark"], tags: ["drill type beat", "uk drill"], nonExclusivePaise: 59900, exclusivePaise: 599900, freeLicense: false, featured: false, plays: 960 },
  { title: "Velvet Hour", genre: "R&B", language: "Instrumental", bpm: 68, key: "Eb Major", moods: ["smooth", "romantic"], tags: ["rnb type beat", "slow jam"], nonExclusivePaise: 54900, exclusivePaise: 549900, freeLicense: true, featured: false, plays: 740 },
  { title: "Sunset Highway", genre: "Afrobeats", language: "Instrumental", bpm: 102, key: "G Major", moods: ["warm", "uplifting"], tags: ["afrobeats type beat", "summer"], nonExclusivePaise: 64900, exclusivePaise: 649900, freeLicense: true, featured: true, plays: 1580 },
  { title: "Gidda Fire", genre: "Punjabi", language: "Punjabi", bpm: 96, key: "E Minor", moods: ["energetic", "party"], tags: ["sidhu type beat", "punjabi trap"], nonExclusivePaise: 59900, exclusivePaise: 599900, freeLicense: true, featured: false, plays: 1890 },
  { title: "Filmy Heartbeat", genre: "Bollywood", language: "Hindi", bpm: 88, key: "C Major", moods: ["emotional", "cinematic"], tags: ["arijit type beat", "bollywood sad"], nonExclusivePaise: 89900, exclusivePaise: 899900, freeLicense: false, featured: true, plays: 1710 },
  { title: "Glass Skyline", genre: "Electronic", language: "Instrumental", bpm: 124, key: "B Minor", moods: ["futuristic", "driving"], tags: ["edm type beat", "synthwave"], nonExclusivePaise: 59900, exclusivePaise: 599900, freeLicense: true, featured: false, plays: 620 },
  { title: "Pop Mirage", genre: "Pop", language: "Instrumental", bpm: 118, key: "A Major", moods: ["bright", "catchy"], tags: ["pop type beat", "radio"], nonExclusivePaise: 54900, exclusivePaise: 549900, freeLicense: true, featured: false, plays: 880 },
  { title: "Static Bloom", genre: "Trap", language: "Instrumental", bpm: 150, key: "D Minor", moods: ["hard", "bouncy"], tags: ["future type beat", "trap soul"], nonExclusivePaise: 74900, exclusivePaise: 749900, freeLicense: false, featured: false, plays: 540 },
  { title: "Paper Lanterns", genre: "Lo-fi", language: "Instrumental", bpm: 72, key: "G Minor", moods: ["calm", "nostalgic"], tags: ["lofi type beat", "rainy day"], nonExclusivePaise: 44900, exclusivePaise: 449900, freeLicense: true, featured: false, plays: 1010 },
  { title: "Dilli Drip", genre: "Hip Hop", language: "Hindi", bpm: 98, key: "F Minor", moods: ["confident", "swagger"], tags: ["emiway type beat", "delhi rap"], nonExclusivePaise: 64900, exclusivePaise: 649900, freeLicense: true, featured: false, plays: 1260 },
  { title: "Concrete Choir", genre: "Drill", language: "Instrumental", bpm: 142, key: "G# Minor", moods: ["cold", "tense"], tags: ["central cee type beat", "drill"], nonExclusivePaise: 59900, exclusivePaise: 599900, freeLicense: false, featured: false, plays: 430 },
  { title: "Slow Burn", genre: "R&B", language: "Instrumental", bpm: 74, key: "Bb Minor", moods: ["sensual", "late night"], tags: ["weeknd type beat", "dark rnb"], nonExclusivePaise: 59900, exclusivePaise: 599900, freeLicense: true, featured: false, plays: 810 },
  { title: "Lagos Lights", genre: "Afrobeats", language: "Instrumental", bpm: 108, key: "A Minor", moods: ["groovy", "festive"], tags: ["burna boy type beat", "afro pop"], nonExclusivePaise: 64900, exclusivePaise: 649900, freeLicense: true, featured: false, plays: 700 },
  { title: "Dhol Drop", genre: "Punjabi", language: "Punjabi", bpm: 100, key: "D Minor", moods: ["loud", "celebration"], tags: ["karan aujla type beat", "dhol trap"], nonExclusivePaise: 69900, exclusivePaise: 699900, freeLicense: false, featured: false, plays: 1150 },
  { title: "Monsoon Letter", genre: "Bollywood", language: "Hindi", bpm: 80, key: "E Major", moods: ["romantic", "soft"], tags: ["bollywood romantic", "piano"], nonExclusivePaise: 79900, exclusivePaise: 799900, freeLicense: true, featured: false, plays: 590 },
  { title: "Pulse Engine", genre: "Electronic", language: "Instrumental", bpm: 128, key: "C# Minor", moods: ["energetic", "club"], tags: ["house type beat", "dance"], nonExclusivePaise: 54900, exclusivePaise: 549900, freeLicense: false, featured: false, plays: 380 },
  { title: "Golden Static", genre: "Pop", language: "Instrumental", bpm: 112, key: "F Major", moods: ["nostalgic", "upbeat"], tags: ["dua lipa type beat", "retro pop"], nonExclusivePaise: 49900, exclusivePaise: 499900, freeLicense: true, featured: false, plays: 470 },
];
