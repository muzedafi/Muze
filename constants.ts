
export const ART_STYLES: string[] = [
  'Hyper Realistic',
  'Photorealistic',
  'Anime',
  'Cyberpunk',
  'Steampunk',
  'Watercolor',
  'Oil Painting',
  'Low Poly',
  'Pixel Art',
  'Fantasy Art',
  'Concept Art',
  'Gothic Art',
  'Art Nouveau',
  'Surrealism',
  'Impressionism',
  'Cubism',
  'Minimalist',
  '3D Render',
  'Claymation',
  'Vaporwave',
  'Tribal Art',
];

export const COLOR_PALETTES: string[] = [
  'Vibrant Neon',
  'Earthy Tones',
  'Pastel Dreams',
  'Monochromatic',
  'Golden Hour Hues',
  'Synthwave Sunset',
  'Arctic Blues',
  'Volcanic Reds',
  'Onyx & Emas Elegan',
  'Hijau Botani Segar',
  'Biru Teknologi Modern',
  'Glamor Emas Mawar',
  'Merah Marun Mewah',
  'Krem & Cokelat Hangat',
  'Gradien Biru Laut',
];

export const ASPECT_RATIOS: string[] = [
    "1:1", 
    "16:9", 
    "9:16", 
    "4:3", 
    "3:4"
];

export const RESOLUTION_OPTIONS: string[] = [
    "HD",
    "4K",
    "8K"
];

export const BLUR_OPTIONS: string[] = [
    "Tidak ada",
    "Rendah",
    "Sedang",
    "Tinggi"
];

export const ENVIRONMENT_OPTIONS: string[] = [
    "Ruangan estetis dengan lampu LED",
    "Studio profesional dengan pencahayaan lembut",
    "Ruang tamu Skandinavia yang nyaman",
    "Taman tropis yang rimbun saat matahari terbenam",
    "Latar belakang minimalis dengan warna gradien",
    "Pemandangan kota futuristik di malam hari",
    "Kafe yang nyaman dengan interior kayu",
    "Pantai berpasir putih dengan air jernih",
    "Perpustakaan antik dengan rak buku dari lantai ke langit-langit",
    "Pemandangan alam pegunungan yang megah",
    "Interior pesawat ruang angkasa alien",
    "Hutan fantasi yang bercahaya di malam hari",
    "Pasar siberpunk yang ramai dengan lampu neon",
    "Kastil Gotik di atas tebing saat badai",
    "Dunia bawah laut dengan terumbu karang berwarna-warni",
    "Lingkungan Kustom...",
];

export const CAMERA_ANGLES: string[] = [
    'Tangkapan Sejajar Mata',
    'Sudut Rendah',
    'Sudut Tinggi',
    'Tangkapan Dekat',
    'Tangkapan Lebar',
    'Sudut Miring',
    'Tangkapan Atas',
];

export const LIGHTING_STYLES: string[] = [
    'Cahaya Latar',
    'Cahaya Studio Lembut',
    'Pencahayaan Dramatis',
    'Golden Hour',
    'Blue Hour',
    'Rim Lighting',
    'Cahaya Neon',
];

export const TIME_OPTIONS: string[] = [
    'Siang Hari',
    'Sore Hari',
    'Malam Hari'
];

// --- New Video Constants ---

export const VIDEO_CONCEPTS: string[] = [
    'Afiliasi',
    'Influencer',
    'Podcaster',
    'Kustom...',
];

export const VIDEO_STYLES: string[] = [
    'Sinematik',
    'Animasi 3D',
    'Stop Motion',
    'Gaya Dokumenter',
    'Rekaman Arsip',
    'Time-lapse',
    'Slow Motion',
];

export const CAMERA_MOVEMENTS: string[] = [
    'Tangkapan statis',
    'Tangkapan pelacakan lambat',
    'Geser ke kiri',
    'Geser ke kanan',
    'Miring ke atas',
    'Miring ke bawah',
    'Perbesar',
    'Perkecil',
    'Dolly Zoom',
];

export const VIDEO_RESOLUTIONS: string[] = [
    '720p',
    '1080p',
];

export const VIDEO_LANGUAGES: string[] = [
    'Bahasa Indonesia',
    'English',
    'Jawa',
    'Sunda',
    'Betawi',
];

export const VOICE_GENDERS: string[] = [
    'Pria',
    'Wanita',
    'Kakek-kakek',
    'Nenek-nenek',
    'Anak-anak',
];

export const SPEAKING_STYLES: string[] = [
    'Naratif',
    'Percakapan',
    'Bersemangat',
    'Berbisik',
    'Monoton',
    'Komedi',
];

export const VIDEO_MOODS: string[] = [
    'Tenang',
    'Dramatis',
    'Gembira',
    'Misterius',
    'Menegangkan',
    'Romantis',
];

interface MovementOption {
    label: string;
    value: string;
}

export const MOVEMENT_OPTIONS: { [key: string]: MovementOption[] } = {
    en: [
        { label: 'Lifts product slightly, presenting to camera', value: 'Lifts the product slightly, presenting it to the camera' },
        { label: 'Steps back, emphasizing product uniqueness', value: 'Takes a step back while presenting the product, emphasizing its uniqueness' },
        { label: 'Lifts product higher, showing fabric quality', value: 'Lifts the product higher, tilting it to show the fabric quality' },
        { label: 'Slowly zooms in on a product detail', value: 'Slowly zooms in on a product detail' },
        { label: 'Quickly pans across multiple product variations', value: 'Quickly pans across multiple product variations' },
        { label: 'Shows product from a low angle', value: 'Shows the product from a low angle to make it look impressive' },
        { label: 'Custom', value: 'Custom' }
    ],
    id: [
        { label: 'Mengangkat produk sedikit, menunjukkannya ke kamera', value: 'Lifts the product slightly, presenting it to the camera' },
        { label: 'Mundur selangkah, menekankan keunikan produk', value: 'Takes a step back while presenting the product, emphasizing its uniqueness' },
        { label: 'Mengangkat produk lebih tinggi, menunjukkan kualitas kain', value: 'Lifts the product higher, tilting it to show the fabric quality' },
        { label: 'Memperbesar detail produk secara perlahan', value: 'Slowly zooms in on a product detail' },
        { label: 'Geser cepat melintasi beberapa variasi produk', value: 'Quickly pans across multiple product variations' },
        { label: 'Menampilkan produk dari sudut rendah', value: 'Shows the product from a low angle to make it look impressive' },
        { label: 'Kustom', value: 'Custom' }
    ]
};

export const DIALOGUE_STYLES: { [key: string]: { label: string; value: string }[] } = {
    en: [
        { label: 'Affiliate', value: 'Affiliate' },
        { label: 'Comedy', value: 'Comedy' },
        { label: 'Conversational', value: 'Conversational' },
        { label: 'Narrative', value: 'Narrative' },
        { label: 'Enthusiastic', value: 'Enthusiastic' },
        { label: 'Formal', value: 'Formal' },
        { label: 'Whispering', value: 'Whispering' },
    ],
    id: [
        { label: 'Afiliasi', value: 'Affiliate' },
        { label: 'Komedi', value: 'Comedy' },
        { label: 'Percakapan', value: 'Conversational' },
        { label: 'Naratif', value: 'Narrative' },
        { label: 'Antusias', value: 'Enthusiastic' },
        { label: 'Formal', value: 'Formal' },
        { label: 'Berbisik', value: 'Whispering' },
    ]
};

export const DIALOGUE_TEMPOS: { [key: string]: { label: string; value: string }[] } = {
    en: [
        { label: 'Slow', value: 'Slow' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Fast', value: 'Fast' },
    ],
    id: [
        { label: 'Lambat', value: 'Slow' },
        { label: 'Sedang', value: 'Medium' },
        { label: 'Cepat', value: 'Fast' },
    ]
};

export const STRUCTURED_PROMPT_TEXTS = {
    en: {
        title: 'Structured Video Prompt',
        description: 'Generate a structured video prompt with an affiliate concept (Hook, Problem-Solve, CTA).',
        dialogueSettingsTitle: 'Dialogue Settings',
        dialogueStyleLabel: 'Dialogue Style',
        dialogueLanguageLabel: 'Dialogue Language',
        dialogueTempoLabel: 'Dialogue Tempo',
        hookTitle: 'Hook',
        problemTitle: 'Problem-Solve',
        ctaTitle: 'Call to Action',
        customPlaceholder: 'Enter custom movement description...',
        dialoguePlaceholder: 'Enter dialogue manually (optional, AI will generate if blank)...',
        generateButton: 'Generate JSON Prompt',
        loadingButton: 'Generating...',
        copyButton: 'Copy',
        copiedButton: 'Copied!',
        error: 'Please fill in all custom movement descriptions if selected.',
    },
    id: {
        title: 'Prompt Video Terstruktur',
        description: 'Hasilkan prompt video terstruktur dengan konsep afiliasi (Hook, Problem-Solve, CTA).',
        dialogueSettingsTitle: 'Pengaturan Dialog',
        dialogueStyleLabel: 'Gaya Dialog',
        dialogueLanguageLabel: 'Bahasa Dialog',
        dialogueTempoLabel: 'Tempo Dialog',
        hookTitle: 'Pancingan (Hook)',
        problemTitle: 'Solusi (Problem-Solve)',
        ctaTitle: 'Ajakan Bertindak (CTA)',
        customPlaceholder: 'Masukkan deskripsi gerakan kustom...',
        dialoguePlaceholder: 'Masukkan dialog manual (opsional, AI akan membuat jika kosong)...',
        generateButton: 'Hasilkan JSON Prompt',
        loadingButton: 'Menghasilkan...',
        copyButton: 'Salin',
        copiedButton: 'Tersalin!',
        error: 'Harap isi semua deskripsi gerakan kustom jika dipilih.',
    }
};