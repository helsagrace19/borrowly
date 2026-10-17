import airfryerPhoto from "../assets/items/airfryer.jpg";
import alexPhoto from "../assets/items/alex.jpg";
import bicyclePhoto from "../assets/items/bicycle.jpg";
import blenderPhoto from "../assets/items/blender.jpg";
import boardgamePhoto from "../assets/items/boardgame.jpg";
import bookshelfPhoto from "../assets/items/bookshelf.jpg";
import drillPhoto from "../assets/items/drill.jpg";
import guitarPhoto from "../assets/items/guitar.jpg";
import kettlePhoto from "../assets/items/kettle.jpg";
import ladderPhoto from "../assets/items/ladder.jpg";
import mixerPhoto from "../assets/items/mixer.jpg";
import projectorPhoto from "../assets/items/projector.jpg";
import sewingPhoto from "../assets/items/sewing.jpg";
import tentPhoto from "../assets/items/tent.jpg";
import toolboxPhoto from "../assets/items/toolbox.jpg";
import vacuumPhoto from "../assets/items/vacuum.jpg";

import type { Borrower, Category, Item, ItemLocation, Owner } from "../types";
import { addDays, todayISO } from "../lib/dates";

export const COMMUNITY = "Maple House";

export const borrower: Borrower = {
  name: "Sam Rivera",
  initials: "SR",
  community: COMMUNITY,
  floor: "Floor 2",
  memberSince: "2023",
  location: { city: "Lagos", neighbourhood: "Yaba", community: COMMUNITY },
};

export const owners: Owner[] = [
  {
    id: "alex",
    name: "Alex Morgan",
    initials: "AM",
    floor: "Floor 3",
    distance: "2 floors away",
    rating: 4.9,
    ratingCount: 38,
    lends: 12,
    memberSince: "2023",
    photo: alexPhoto,
    note: "I'm usually home after 6pm on weekdays, so evenings are easiest.",
  },
  {
    id: "priya",
    name: "Priya Raman",
    initials: "PR",
    floor: "Floor 1",
    distance: "1 floor down",
    rating: 4.8,
    ratingCount: 26,
    lends: 9,
    memberSince: "2022",
    note: "Happy to hand things over at the lobby bench by the front desk.",
  },
  {
    id: "daniel",
    name: "Daniel Okafor",
    initials: "DO",
    floor: "Floor 4",
    distance: "3 floors away",
    rating: 4.7,
    ratingCount: 19,
    lends: 7,
    memberSince: "2024",
    note: "Please message me the day before so I remember to dig it out.",
  },
  {
    id: "marta",
    name: "Marta Silva",
    initials: "MS",
    floor: "Floor 2",
    distance: "Same floor",
    rating: 5.0,
    ratingCount: 51,
    lends: 21,
    memberSince: "2021",
    note: "Knock on 2C any time before 9pm. I don't mind at all.",
  },
  {
    id: "jonas",
    name: "Jonas Weber",
    initials: "JW",
    floor: "Floor 5",
    distance: "4 floors away",
    rating: 4.6,
    ratingCount: 12,
    lends: 5,
    memberSince: "2024",
    note: "The ladder is awkward to carry alone — bring a second pair of hands.",
  },
  {
    id: "chen",
    name: "Chen Wei",
    initials: "CW",
    floor: "Floor 6",
    distance: "5 floors away",
    rating: 4.9,
    ratingCount: 44,
    lends: 18,
    memberSince: "2022",
    note: "There's a lift to the sixth floor, so size really isn't a problem.",
  },
];

const today = todayISO();

/** Dates the owner has already promised to someone else. */
function booked(fromOffset: number, toOffset: number) {
  return { from: addDays(today, fromOffset), to: addDays(today, toOffset) };
}

export type CatalogueItemSeed = Omit<
  Item,
  | "origin"
  | "photos"
  | "location"
  | "locationVisibility"
  | "pricing"
  | "deposit"
  | "handoffPreferences"
  | "availabilityFrom"
  | "paused"
  | "createdAt"
  | "updatedAt"
>;

const itemSeeds: CatalogueItemSeed[] = [
  {
    id: "drill",
    name: "18V Cordless Drill",
    category: "Tools",
    ownerId: "alex",
    photo: drillPhoto,
    condition: "Good — light wear on the case",
    summary: "Drill, charger and a full bit set in a carry case.",
    description:
      "Compact cordless drill I've used for two rounds of shelf-building. Plenty of torque for plasterboard and softwood, and the battery still holds a full charge.",
    accessories: ["Charger", "24-piece bit set", "Carry case"],
    maxDays: 3,
    handoffPlace: "Lobby, ground floor",
    handoffNote: "Alex buzzes you in and meets you by the lifts.",
    availability: "available",
    bookedRanges: [booked(5, 7)],
    tags: ["diy", "power tool", "shelves", "drill", "flat pack"],
  },
  {
    id: "projector",
    name: "Portable Projector",
    category: "Tech",
    ownerId: "priya",
    photo: projectorPhoto,
    condition: "Excellent",
    summary: "1080p projector that is happy against a plain wall.",
    description:
      "Small enough to sit on a table, bright enough to watch a film with the curtains half closed. I mostly use it for match nights.",
    accessories: ["HDMI cable", "Remote", "Carrying bag"],
    maxDays: 4,
    handoffPlace: "Flat 1B door",
    handoffNote: "Priya works from home on Tuesdays and Thursdays.",
    availability: "available",
    bookedRanges: [booked(3, 4)],
    tags: ["film", "movie night", "sport", "cinema", "projector"],
  },
  {
    id: "mixer",
    name: "Stand Mixer",
    category: "Kitchen",
    ownerId: "marta",
    photo: mixerPhoto,
    condition: "Good — a few marks on the base",
    summary: "Bowl, whisk, dough hook and flat beater.",
    description:
      "The workhorse for birthday cakes on this floor. It handles a two-loaf dough without complaining, but please don't put the bowl in the dishwasher.",
    accessories: ["Dough hook", "Whisk", "Flat beater", "Mixing bowl"],
    maxDays: 5,
    handoffPlace: "Flat 2C door",
    handoffNote: "Marta is on the same floor, so it's a short walk.",
    availability: "available",
    bookedRanges: [booked(10, 12)],
    tags: ["baking", "cake", "bread", "kitchen", "mixer"],
  },
  {
    id: "tent",
    name: "4-Person Camping Tent",
    category: "Outdoors",
    ownerId: "daniel",
    photo: tentPhoto,
    condition: "Good — reproofed last summer",
    summary: "Sleeps four, with groundsheet and pegs.",
    description:
      "We take this to the coast most summers. Pitches in about ten minutes with two people. Please let it dry fully before folding it away.",
    accessories: ["Groundsheet", "12 pegs", "Carry bag"],
    maxDays: 7,
    handoffPlace: "Floor 4 lift lobby",
    handoffNote: "Large item — the lift goes straight up to floor 4.",
    availability: "available",
    bookedRanges: [booked(8, 15)],
    tags: ["camping", "festival", "weekend", "tent", "outdoors"],
  },
  {
    id: "sewing",
    name: "Sewing Machine",
    category: "Crafts",
    ownerId: "marta",
    photo: sewingPhoto,
    condition: "Well used but reliable",
    summary: "Straight and zigzag stitch, with a spare bobbin.",
    description:
      "My mother's machine and still going strong. It is happiest with medium-weight cotton. I'll show you how to thread it when you collect.",
    accessories: ["Foot pedal", "Spare bobbins"],
    maxDays: null,
    handoffPlace: "Flat 2C door",
    handoffNote: "Marta prefers to hand this one over in person.",
    availability: "available",
    bookedRanges: [],
    tags: ["sewing", "hemming", "curtains", "craft", "repair"],
  },
  {
    id: "guitar",
    name: "Semi-Acoustic Guitar",
    category: "Music",
    ownerId: "chen",
    photo: guitarPhoto,
    condition: "Good — fresh strings",
    summary: "With soft case, capo and picks.",
    description:
      "Six strings, a warm tone and no amp needed for a living-room singalong. I restrung it last month, so it holds tuning well.",
    accessories: ["Soft case", "Capo", "3 picks"],
    maxDays: 5,
    handoffPlace: "Floor 6, flat 6A",
    handoffNote: "There is a lift, so the sixth floor is easy.",
    availability: "available",
    bookedRanges: [booked(2, 3)],
    tags: ["guitar", "music", "party", "band", "practice"],
  },
  {
    id: "vacuum",
    name: "Robot Vacuum",
    category: "Home",
    ownerId: "priya",
    photo: vacuumPhoto,
    condition: "Excellent",
    summary: "Runs for about 90 minutes on a charge.",
    description:
      "Great for a pre-party tidy-up on hard floors. It needs the charging dock to go back to, so you borrow both.",
    accessories: ["Charging dock", "Spare filter"],
    maxDays: 3,
    handoffPlace: "Flat 1B door",
    handoffNote: "Priya asks that you empty the bin before returning it.",
    availability: "available",
    bookedRanges: [],
    tags: ["cleaning", "tidy", "hoover", "vacuum", "party"],
  },
  {
    id: "airfryer",
    name: "Air Fryer",
    category: "Kitchen",
    ownerId: "daniel",
    photo: airfryerPhoto,
    condition: "Good",
    summary: "Large single basket, serves three comfortably.",
    description:
      "Bought during a very enthusiastic January. It makes excellent roast potatoes and reheats leftovers better than a microwave.",
    accessories: ["Crisper basket", "Recipe booklet"],
    maxDays: 4,
    handoffPlace: "Floor 4 lift lobby",
    handoffNote: "Please wipe the basket before it comes back.",
    availability: "available",
    bookedRanges: [booked(6, 6)],
    tags: ["cooking", "kitchen", "dinner", "air fryer", "roast"],
  },
  {
    id: "ladder",
    name: "Extension Ladder",
    category: "Tools",
    ownerId: "jonas",
    photo: ladderPhoto,
    condition: "Good — heavy duty",
    summary: "Reaches about 3.5 metres when extended.",
    description:
      "Aluminium and surprisingly heavy. Fine for changing a ceiling light or clearing a gutter, but it takes two people to move safely.",
    accessories: [],
    maxDays: 2,
    handoffPlace: "Floor 5 lift lobby",
    handoffNote: "Jonas will help carry it down to your floor.",
    availability: "available",
    bookedRanges: [booked(1, 1)],
    tags: ["ladder", "diy", "light fitting", "gutter", "height"],
  },
  {
    id: "blender",
    name: "Food Processor",
    category: "Kitchen",
    ownerId: "chen",
    photo: blenderPhoto,
    condition: "Excellent",
    summary: "Blender jug plus a food-processor bowl.",
    description:
      "Two machines in one. The blade set covers soup, pesto and pastry. Everything except the motor housing can go in the dishwasher.",
    accessories: ["Blade set", "Dough blade", "Bowl lid"],
    maxDays: 3,
    handoffPlace: "Floor 6, flat 6A",
    handoffNote: "Fits easily in a shopping bag.",
    availability: "available",
    bookedRanges: [],
    tags: ["soup", "smoothie", "kitchen", "blender", "processor"],
  },
  {
    id: "kettle",
    name: "Electric Kettle",
    category: "Kitchen",
    ownerId: "marta",
    photo: kettlePhoto,
    condition: "Excellent",
    summary: "1.7 litre, cordless pour, fast boil.",
    description:
      "A spare kettle for when yours gives up, or when you have more guests than teabags. Small enough to carry in one hand.",
    accessories: ["Cordless base"],
    maxDays: 4,
    handoffPlace: "Flat 2C door",
    handoffNote: "Marta will let you know as soon as it is back.",
    availability: "unavailable",
    unavailableNote: "Lent to a neighbour on floor 4 — due back in about 3 days.",
    bookedRanges: [],
    tags: ["kettle", "tea", "hot water", "kitchen", "spare"],
  },
  {
    id: "boardgame",
    name: "Board Game Bundle",
    category: "Games",
    ownerId: "priya",
    photo: boardgamePhoto,
    condition: "Good — all pieces counted",
    summary: "Three games for a rainy evening.",
    description:
      "A strategy game, a word game and something loud for a big group. I counted every piece last month, so please keep the bags separate.",
    accessories: ["3 games", "Rule sheets", "Piece bags"],
    maxDays: 7,
    handoffPlace: "Flat 1B door",
    handoffNote: "Priya is happy to lend these for a whole week.",
    availability: "available",
    bookedRanges: [],
    tags: ["games", "evening", "party", "friends", "board game"],
  },
  {
    id: "toolbox",
    name: "Socket & Spanner Set",
    category: "Tools",
    ownerId: "alex",
    photo: toolboxPhoto,
    condition: "Good",
    summary: "72-tooth ratchet with 18 sockets and an extension bar.",
    description:
      "For flat-pack furniture, bike repairs and anything with a stubborn bolt. The case keeps everything in its own slot.",
    accessories: ["72-tooth ratchet", "18 sockets", "Extension bar"],
    maxDays: 3,
    handoffPlace: "Lobby, ground floor",
    handoffNote: "Alex hands this over at the same time as the drill, usually.",
    availability: "available",
    bookedRanges: [],
    tags: ["diy", "tools", "bike repair", "flat pack", "spanner"],
  },
  {
    id: "bicycle",
    name: "City Bicycle",
    category: "Outdoors",
    ownerId: "marta",
    photo: bicyclePhoto,
    condition: "Good — recently serviced",
    summary: "Step-through frame with lights and a lock.",
    description:
      "A comfortable city bike with a basket. Perfect for a weekend of errands when yours is in the shop. Please bring it in overnight.",
    accessories: ["Lights", "U-lock", "Chain"],
    maxDays: 2,
    handoffPlace: "Bike store, ground floor",
    handoffNote: "Marta keeps it locked in the bike store and will meet you there.",
    availability: "available",
    bookedRanges: [booked(4, 6)],
    tags: ["bike", "cycling", "errands", "transport", "bicycle"],
  },
  {
    id: "books",
    name: "Holiday Book Bundle",
    category: "Books",
    ownerId: "chen",
    photo: bookshelfPhoto,
    condition: "Read but well looked after",
    summary: "Twelve paperbacks — take as many as you like.",
    description:
      "Crime, sci-fi and one very long historical novel. Take the whole shelf for a fortnight, or just pick out a couple.",
    accessories: ["12 paperbacks"],
    maxDays: 14,
    handoffPlace: "Floor 6, flat 6A",
    handoffNote: "A tote bag is included so they travel safely.",
    availability: "available",
    bookedRanges: [],
    tags: ["books", "reading", "holiday", "paperbacks", "novels"],
  },
];

/**
 * Seeded demo listings. Listing-only fields are filled in here so the seed
 * data stays readable and the shape stays in one place.
 *
 * A few items are priced and a couple carry a refundable deposit, so the
 * financial parts of the product are visible without editing anything first.
 */
const seededDailyFees: Record<string, number> = {
  projector: 500,
  tent: 1000,
  ladder: 500,
  bicycle: 500,
  guitar: 500,
};

const seededDeposits: Record<string, number> = {
  projector: 5000,
  guitar: 10000,
  bicycle: 5000,
};

/**
 * Owners live in different places on purpose, so browsing beyond your own
 * building has something to find.
 */
const ownerLocations: Record<string, ItemLocation> = {
  alex: { city: "Lagos", neighbourhood: "Yaba", community: COMMUNITY },
  priya: { city: "Lagos", neighbourhood: "Yaba", community: COMMUNITY },
  daniel: { city: "Lagos", neighbourhood: "Yaba", community: COMMUNITY },
  marta: { city: "Lagos", neighbourhood: "Yaba", community: COMMUNITY },
  jonas: { city: "Abuja", neighbourhood: "Wuse II", community: "Riverbank Court" },
  chen: { city: "Lagos", neighbourhood: "Lekki Phase 1", community: "Palm Grove Estate" },
};

export const items: Item[] = itemSeeds.map((seed) => {
  const dailyFee = seededDailyFees[seed.id] ?? 0;
  const depositAmount = seededDeposits[seed.id] ?? 0;

  return {
    ...seed,
    origin: "catalogue",
    photos: [seed.photo],
    location: ownerLocations[seed.ownerId] ?? borrower.location,
    locationVisibility: "floor",
    pricing: dailyFee > 0 ? { type: "paid", dailyFee } : { type: "free", dailyFee: 0 },
    deposit:
      depositAmount > 0
        ? { required: true, amount: depositAmount }
        : { required: false, amount: 0 },
    handoffPreferences: ["In-person handover"],
    availabilityFrom: null,
    paused: false,
    createdAt: 0,
    updatedAt: 0,
  };
});

/** The signed-in borrower, so their own listings resolve to a real owner. */
export const selfOwner: Owner = {
  id: "me",
  name: borrower.name,
  initials: borrower.initials,
  floor: borrower.floor,
  distance: "You",
  rating: 5,
  ratingCount: 0,
  lends: 0,
  memberSince: borrower.memberSince,
};

export const selfOwnerId = selfOwner.id;

/** Handoff options offered on a listing. */
export const handoffOptions = [
  "Lobby handover",
  "Doorstep handover",
  "Shared courtyard",
  "Bike store",
  "Front desk",
];

/** Conditions offered when describing an item. */
export const conditionOptions = [
  "Like new",
  "Good — light wear",
  "Well used but working",
  "Some marks, works fine",
];

/** Bundled photos a listing can borrow from, so publishing works offline. */
export const samplePhotos: { id: string; label: string; src: string }[] = [
  { id: "drill", label: "Power tools", src: drillPhoto },
  { id: "toolbox", label: "Tool kit", src: toolboxPhoto },
  { id: "mixer", label: "Kitchen appliance", src: mixerPhoto },
  { id: "kettle", label: "Small kitchen", src: kettlePhoto },
  { id: "tent", label: "Outdoor gear", src: tentPhoto },
  { id: "bicycle", label: "Bicycle", src: bicyclePhoto },
  { id: "guitar", label: "Instrument", src: guitarPhoto },
  { id: "boardgame", label: "Games", src: boardgamePhoto },
  { id: "bookshelf", label: "Books", src: bookshelfPhoto },
  { id: "sewing", label: "Craft", src: sewingPhoto },
  { id: "vacuum", label: "Home appliance", src: vacuumPhoto },
  { id: "blender", label: "Food prep", src: blenderPhoto },
];

export const categoryOrder: Category[] = [
  "Tools",
  "Kitchen",
  "Home",
  "Outdoors",
  "Tech",
  "Music",
  "Games",
  "Books",
  "Crafts",
];

/** Only the categories that actually have something to borrow. */
export const activeCategories: Category[] = categoryOrder.filter((category) =>
  items.some((item) => item.category === category),
);

const ownerIndex = new Map(owners.map((owner) => [owner.id, owner]));
const itemIndex = new Map(items.map((item) => [item.id, item]));

/** Neighbours only — the borrower is resolved separately. */
export function getOwner(id: string): Owner {
  if (id === selfOwner.id) return selfOwner;
  return ownerIndex.get(id) ?? owners[0];
}

export function isSelfOwner(id: string): boolean {
  return id === selfOwner.id;
}

/** Seeded items only. Prefer the store's merged lookup in components. */
export function getItem(id: string): Item | undefined {
  return itemIndex.get(id);
}
