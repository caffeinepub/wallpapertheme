import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import {
  Download,
  Heart,
  HelpCircle,
  Home,
  ImageIcon,
  MessageCircle,
  Phone,
  Search,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
type Page = "home" | "search" | "favorites" | "help";

interface Wallpaper {
  id: string;
  title: string;
  category: string;
  url: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "nature", label: "🌿 Nature", query: "nature" },
  { id: "city", label: "🌆 City", query: "city" },
  { id: "abstract", label: "🎨 Abstract", query: "abstract" },
  { id: "space", label: "🚀 Space", query: "space" },
  { id: "animals", label: "🦁 Animals", query: "animals" },
  { id: "dark", label: "🌑 Dark", query: "dark" },
  { id: "anime", label: "✨ Anime", query: "anime" },
  { id: "cars", label: "🏎️ Cars", query: "cars" },
  { id: "sports", label: "⚽ Sports", query: "sports" },
  { id: "food", label: "🍕 Food", query: "food" },
  { id: "minimal", label: "◾ Minimal", query: "minimal" },
  { id: "architecture", label: "🏛️ Architecture", query: "architecture" },
  { id: "beach", label: "🏖️ Beach", query: "beach" },
  { id: "mountains", label: "🏔️ Mountains", query: "mountains" },
  { id: "flowers", label: "🌸 Flowers", query: "flowers" },
  { id: "gaming", label: "🎮 Gaming", query: "gaming" },
];

const WALLPAPER_TITLES: Record<string, string[]> = {
  nature: [
    "Forest Mist",
    "Golden Hour",
    "Rainy Canopy",
    "Wild Meadow",
    "Creek Flow",
    "Autumn Blaze",
    "Morning Dew",
    "Pine Ridge",
    "Mossy Stones",
    "Sunlit Fern",
    "River Bend",
    "Jungle Veil",
  ],
  city: [
    "Neon Skyline",
    "Rain Streets",
    "Rooftop View",
    "Night Bridge",
    "Urban Grid",
    "Metro Rush",
    "Glass Tower",
    "Old Quarter",
    "Harbor Lights",
    "Street Fog",
    "Dawn Traffic",
    "Market Alley",
  ],
  abstract: [
    "Liquid Flow",
    "Fractal Dream",
    "Neon Splash",
    "Crystal Prism",
    "Paint Storm",
    "Warp Field",
    "Color Drift",
    "Smoke Art",
    "Blob World",
    "Ink Drop",
    "Polygon Sky",
    "Geo Burst",
  ],
  space: [
    "Nebula Burst",
    "Milky Way",
    "Black Hole",
    "Star Nursery",
    "Cosmic Dust",
    "Aurora Belt",
    "Lunar Surface",
    "Saturn Ring",
    "Galaxy Spin",
    "Comet Trail",
    "Red Giant",
    "Deep Void",
  ],
  animals: [
    "Lion Pride",
    "Wolf Moon",
    "Eagle Soar",
    "Tiger Stripes",
    "Elephant Walk",
    "Whale Song",
    "Fox Den",
    "Panda Peace",
    "Cheetah Run",
    "Owl Eyes",
    "Bear Cub",
    "Dolphin Leap",
  ],
  dark: [
    "Shadow Realm",
    "Dark Forest",
    "Black Lotus",
    "Midnight City",
    "Eclipse",
    "Void Gate",
    "Raven Wing",
    "Storm Crow",
    "Dark Matter",
    "Obsidian",
    "Night Bloom",
    "Abyss",
  ],
  anime: [
    "Sakura Rain",
    "Cyber Tokyo",
    "Spirit Fox",
    "Dragon Shrine",
    "School Dusk",
    "Mech Pilot",
    "Katana Flash",
    "Ocean Spirit",
    "Sky Castle",
    "Demon Hunt",
    "Ninja Storm",
    "Maid Café",
  ],
  cars: [
    "Neon Drift",
    "Track Beast",
    "Classic Chrome",
    "Midnight Run",
    "Supercar Red",
    "Burnout King",
    "Rally Mud",
    "Lambo Gold",
    "GT Shadow",
    "Muscle Car",
    "Formula One",
    "Retro Ride",
  ],
  sports: [
    "Stadium Roar",
    "Free Kick",
    "Slam Dunk",
    "Podium Finish",
    "Icy Rink",
    "Tennis Ace",
    "Sprint Start",
    "Wave Surf",
    "Mountain Bike",
    "Boxing Ring",
    "Home Run",
    "Penalty Kick",
  ],
  food: [
    "Pizza Night",
    "Sushi Roll",
    "Burger Stack",
    "Pasta Feast",
    "Taco Tuesday",
    "Ramen Bowl",
    "Cake Slice",
    "Coffee Art",
    "Avocado Toast",
    "Donut Wall",
    "Steak Night",
    "Fruit Bowl",
  ],
  minimal: [
    "White Space",
    "Mono Line",
    "Sand Dune",
    "Fog Layer",
    "Clean Desk",
    "Paper Fold",
    "One Object",
    "Flat Color",
    "Shadow Play",
    "Negative Space",
    "Thin Grid",
    "Zen Stone",
  ],
  architecture: [
    "Glass Facade",
    "Brutalist Block",
    "Arc de Tri",
    "Steel Spine",
    "Arch Bridge",
    "Dome Light",
    "Stair Spiral",
    "Old Palace",
    "Cathedral",
    "Skybridge",
    "Concrete Art",
    "Timber Frame",
  ],
  beach: [
    "Sunset Shore",
    "Palm Wave",
    "Tide Pool",
    "Coral Reef",
    "Driftwood",
    "Shell Walk",
    "Blue Lagoon",
    "Cliff Cove",
    "Wave Crash",
    "Bonfire Dusk",
    "Sand Castle",
    "Hammock View",
  ],
  mountains: [
    "Peak Frost",
    "Alpine Glow",
    "Valley Mist",
    "Rock Face",
    "Summit Cloud",
    "Snow Ridge",
    "Glacier Lake",
    "Pine Peak",
    "Dawn Summit",
    "Lava Field",
    "Storm Pass",
    "Eagle Nest",
  ],
  flowers: [
    "Cherry Bloom",
    "Rose Garden",
    "Lavender Field",
    "Sunflower Sky",
    "Poppy Wave",
    "Lily Pond",
    "Orchid Mist",
    "Daisy Chain",
    "Blossom Rain",
    "Peony Crown",
    "Wisteria",
    "Tulip Row",
  ],
  gaming: [
    "Pixel Quest",
    "Neon Arena",
    "Boss Battle",
    "Level Up",
    "Dark Dungeon",
    "Cyber Clash",
    "Retro Arcade",
    "Space Raid",
    "Moba Map",
    "Fantasy RPG",
    "Racing Sim",
    "Zombie Run",
  ],
};

function buildWallpapers(): Wallpaper[] {
  const all: Wallpaper[] = [];
  let sigBase = 1;
  for (const cat of CATEGORIES) {
    const titles = WALLPAPER_TITLES[cat.id] ?? [];
    for (let i = 0; i < 12; i++) {
      all.push({
        id: `${cat.id}-${i}`,
        title: titles[i] ?? `${cat.label} ${i + 1}`,
        category: cat.id,
        url: `https://source.unsplash.com/400x700/?${cat.query}&sig=${sigBase + i}`,
      });
    }
    sigBase += 12;
  }
  return all;
}

const ALL_WALLPAPERS = buildWallpapers();

const FAQ = [
  {
    id: "faq-1",
    q: "How do I set a wallpaper on Android?",
    a: "Tap on any wallpaper to open it fullscreen, then tap 'Set Wallpaper'. Long press the image and select 'Set as Wallpaper' from the menu.",
  },
  {
    id: "faq-2",
    q: "How do I save a wallpaper to my phone?",
    a: "Open the wallpaper fullscreen and tap the Download button. The image will open in a new tab — long press it and choose 'Save Image'.",
  },
  {
    id: "faq-3",
    q: "How do I add a wallpaper to my Favorites?",
    a: "Tap the heart icon on any wallpaper card to add it to your Favorites. Access all saved wallpapers from the Favorites tab.",
  },
  {
    id: "faq-4",
    q: "Why won't the wallpaper load?",
    a: "Wallpapers require an internet connection. Check your connection, refresh the page, or try again later.",
  },
  {
    id: "faq-5",
    q: "Can I use these wallpapers for free?",
    a: "Yes! All wallpapers are sourced from Unsplash and are free for personal use. Check Unsplash's license for commercial use.",
  },
];

// ─── Wallpaper Card ──────────────────────────────────────────────────────────
interface WallpaperCardProps {
  wallpaper: Wallpaper;
  index: number;
  isFav: boolean;
  onToggleFav: (id: string) => void;
  onOpen: (w: Wallpaper) => void;
}

function WallpaperCard({
  wallpaper,
  index,
  isFav,
  onToggleFav,
  onOpen,
}: WallpaperCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      data-ocid={`wallpaper.item.${index}`}
      className="relative group cursor-pointer rounded-xl overflow-hidden"
      style={{ aspectRatio: "9/16" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={() => onOpen(wallpaper)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {!imgLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-xl" />
      )}
      <img
        src={wallpaper.url}
        alt={wallpaper.title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setImgLoaded(true)}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        <p className="text-white text-xs font-medium truncate">
          {wallpaper.title}
        </p>
      </div>
      <button
        type="button"
        className="absolute top-2 right-2 p-1.5 rounded-full glass-card opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav(wallpaper.id);
        }}
        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          size={14}
          className={isFav ? "fill-red-500 text-red-500" : "text-white"}
        />
      </button>
    </motion.div>
  );
}

// ─── Wallpaper Modal ─────────────────────────────────────────────────────────
interface WallpaperModalProps {
  wallpaper: Wallpaper | null;
  isFav: boolean;
  onToggleFav: (id: string) => void;
  onClose: () => void;
}

function WallpaperModal({
  wallpaper,
  isFav,
  onToggleFav,
  onClose,
}: WallpaperModalProps) {
  if (!wallpaper) return null;

  const handleSetWallpaper = () => {
    toast("📱 How to Set Wallpaper", {
      description: "Long press the image and tap 'Set as Wallpaper'",
      duration: 4000,
    });
  };

  const handleDownload = () => {
    window.open(wallpaper.url.replace("400x700", "1080x1920"), "_blank");
  };

  return (
    <motion.div
      data-ocid="wallpaper.modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/90 backdrop-blur-sm w-full h-full cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ aspectRatio: "9/16" }}
        >
          <img
            src={wallpaper.url.replace("400x700", "800x1400")}
            alt={wallpaper.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

          {/* Top controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <button
              type="button"
              data-ocid="wallpaper.close_button"
              className="p-2 rounded-full glass-card"
              onClick={onClose}
            >
              <X size={18} className="text-white" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full glass-card"
              onClick={() => onToggleFav(wallpaper.id)}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart
                size={18}
                className={isFav ? "fill-red-500 text-red-500" : "text-white"}
              />
            </button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
            <p className="text-white font-display font-semibold text-lg">
              {wallpaper.title}
            </p>
            <div className="flex gap-3">
              <Button
                data-ocid="wallpaper.download_button"
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                onClick={handleDownload}
              >
                <Download size={16} className="mr-2" />
                Download
              </Button>
              <Button
                className="flex-1 text-white border-0"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.28 320), oklch(0.58 0.24 290))",
                }}
                onClick={handleSetWallpaper}
              >
                <ImageIcon size={16} className="mr-2" />
                Set Wallpaper
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Home Page ───────────────────────────────────────────────────────────────
interface HomePageProps {
  favorites: Set<string>;
  onToggleFav: (id: string) => void;
}

function HomePage({ favorites, onToggleFav }: HomePageProps) {
  const [activeCategory, setActiveCategory] = useState("nature");
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(
    null,
  );

  const categoryWallpapers = useMemo(
    () => ALL_WALLPAPERS.filter((w) => w.category === activeCategory),
    [activeCategory],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pb-3">
        <div
          className="flex gap-2 overflow-x-auto category-scroll pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat, idx) => (
            <button
              type="button"
              key={cat.id}
              data-ocid={`category.tab.${idx + 1}`}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === cat.id
                  ? "text-white shadow-glow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              style={
                activeCategory === cat.id
                  ? {
                      background:
                        "linear-gradient(135deg, oklch(0.65 0.28 320), oklch(0.58 0.24 290))",
                    }
                  : {}
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="wallpaper-grid">
          {categoryWallpapers.map((w, idx) => (
            <WallpaperCard
              key={w.id}
              wallpaper={w}
              index={idx + 1}
              isFav={favorites.has(w.id)}
              onToggleFav={onToggleFav}
              onOpen={setSelectedWallpaper}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedWallpaper && (
          <WallpaperModal
            wallpaper={selectedWallpaper}
            isFav={favorites.has(selectedWallpaper.id)}
            onToggleFav={onToggleFav}
            onClose={() => setSelectedWallpaper(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Search Page ─────────────────────────────────────────────────────────────
interface SearchPageProps {
  favorites: Set<string>;
  onToggleFav: (id: string) => void;
}

function SearchPage({ favorites, onToggleFav }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(
    null,
  );

  const results = useMemo(() => {
    if (!query.trim()) return ALL_WALLPAPERS.slice(0, 24);
    const q = query.toLowerCase();
    return ALL_WALLPAPERS.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pb-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            data-ocid="search.input"
            placeholder="Search wallpapers, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        {query && (
          <p className="text-xs text-muted-foreground mt-2">
            {results.length} result{results.length !== 1 ? "s" : ""} for &quot;
            {query}&quot;
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {results.length === 0 ? (
          <div data-ocid="search.empty_state" className="text-center py-16">
            <p className="text-muted-foreground text-lg">No wallpapers found</p>
            <p className="text-muted-foreground text-sm mt-1">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="wallpaper-grid">
            {results.map((w, idx) => (
              <WallpaperCard
                key={w.id}
                wallpaper={w}
                index={idx + 1}
                isFav={favorites.has(w.id)}
                onToggleFav={onToggleFav}
                onOpen={setSelectedWallpaper}
              />
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {selectedWallpaper && (
          <WallpaperModal
            wallpaper={selectedWallpaper}
            isFav={favorites.has(selectedWallpaper.id)}
            onToggleFav={onToggleFav}
            onClose={() => setSelectedWallpaper(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Favorites Page ───────────────────────────────────────────────────────────
interface FavoritesPageProps {
  favorites: Set<string>;
  onToggleFav: (id: string) => void;
}

function FavoritesPage({ favorites, onToggleFav }: FavoritesPageProps) {
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(
    null,
  );

  const favWallpapers = useMemo(
    () => ALL_WALLPAPERS.filter((w) => favorites.has(w.id)),
    [favorites],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pb-3">
        <p className="text-sm text-muted-foreground">
          {favWallpapers.length} saved wallpaper
          {favWallpapers.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {favWallpapers.length === 0 ? (
          <motion.div
            data-ocid="favorites.empty_state"
            className="flex flex-col items-center justify-center h-full text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.28 320 / 0.2), oklch(0.58 0.24 290 / 0.2))",
                border: "1px solid oklch(0.65 0.28 320 / 0.3)",
              }}
            >
              <Heart size={32} className="text-primary" />
            </div>
            <p className="text-foreground font-semibold text-lg">
              No favorites yet
            </p>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              Tap the heart icon on any wallpaper to save it here
            </p>
          </motion.div>
        ) : (
          <div className="wallpaper-grid">
            {favWallpapers.map((w, idx) => (
              <WallpaperCard
                key={w.id}
                wallpaper={w}
                index={idx + 1}
                isFav={true}
                onToggleFav={onToggleFav}
                onOpen={setSelectedWallpaper}
              />
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {selectedWallpaper && (
          <WallpaperModal
            wallpaper={selectedWallpaper}
            isFav={favorites.has(selectedWallpaper.id)}
            onToggleFav={onToggleFav}
            onClose={() => setSelectedWallpaper(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Help Page ────────────────────────────────────────────────────────────────
function HelpPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-8">
      <motion.div
        className="glass-card rounded-2xl p-6 mb-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "#25D366" }}
        >
          <MessageCircle size={32} className="text-white" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground mb-1">
          Need Help?
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Chat with us directly on WhatsApp for instant support
        </p>
        <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
          <Phone size={14} />
          <span className="text-sm font-medium">+91 8511525411</span>
        </div>
        <a
          href="https://wa.me/918511525411"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-base transition-transform active:scale-95"
          style={{ background: "#25D366" }}
        >
          <MessageCircle size={20} />
          Chat on WhatsApp
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="font-display font-bold text-lg text-foreground mb-3">
          Frequently Asked Questions
        </h3>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQ.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="glass-card rounded-xl border-0 px-4"
            >
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFav = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Removed from favorites", { duration: 1500 });
      } else {
        next.add(id);
        toast.success("Added to favorites ❤️", { duration: 1500 });
      }
      return next;
    });
  }, []);

  const PAGE_TITLES: Record<Page, string> = {
    home: "WallpaperTheme",
    search: "Search",
    favorites: "Favorites",
    help: "Help & Support",
  };

  const NAV_ITEMS: {
    id: Page;
    icon: React.ReactNode;
    label: string;
    ocid: string;
  }[] = [
    {
      id: "home",
      icon: <Home size={20} />,
      label: "Home",
      ocid: "nav.home.link",
    },
    {
      id: "search",
      icon: <Search size={20} />,
      label: "Search",
      ocid: "nav.search.link",
    },
    {
      id: "favorites",
      icon: <Heart size={20} />,
      label: "Favorites",
      ocid: "nav.favorites.link",
    },
    {
      id: "help",
      icon: <HelpCircle size={20} />,
      label: "Help",
      ocid: "nav.help.link",
    },
  ];

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden">
      {/* Background atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.25 0.12 285 / 0.4), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, oklch(0.22 0.10 320 / 0.3), transparent)",
        }}
      />

      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-10 pb-4 relative z-10">
        <motion.h1
          key={page}
          className="font-display font-bold text-2xl gradient-text"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {PAGE_TITLES[page]}
        </motion.h1>
        {page === "home" && (
          <p className="text-muted-foreground text-sm mt-0.5">
            {ALL_WALLPAPERS.length}+ wallpapers · {CATEGORIES.length} categories
          </p>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            className="h-full flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {page === "home" && (
              <HomePage favorites={favorites} onToggleFav={toggleFav} />
            )}
            {page === "search" && (
              <SearchPage favorites={favorites} onToggleFav={toggleFav} />
            )}
            {page === "favorites" && (
              <FavoritesPage favorites={favorites} onToggleFav={toggleFav} />
            )}
            {page === "help" && <HelpPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer branding */}
      <div className="flex-shrink-0 text-center py-1 relative z-10">
        <p className="text-xs text-muted-foreground">Created by Rahul Parmar</p>
      </div>

      {/* Bottom navigation */}
      <nav
        className="flex-shrink-0 relative z-10 mx-3 mb-3 rounded-2xl glass-card"
        style={{ background: "oklch(0.16 0.025 285 / 0.95)" }}
      >
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              data-ocid={item.ocid}
              onClick={() => setPage(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                page === item.id
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`transition-all duration-200 ${page === item.id ? "scale-110" : "scale-100"}`}
                style={
                  page === item.id
                    ? {
                        filter:
                          "drop-shadow(0 0 8px oklch(0.65 0.28 320 / 0.8))",
                        color: "oklch(0.78 0.22 320)",
                      }
                    : {}
                }
              >
                {item.icon}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
              {page === item.id && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-2 w-5 h-0.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.65 0.28 320), oklch(0.58 0.24 290))",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      <Toaster position="top-center" richColors />
    </div>
  );
}
