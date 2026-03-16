"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Emoji data with categories ─────────────────────────

interface EmojiItem {
  emoji: string;
  name: string;
  keywords?: string[];
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: EmojiItem[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    name: "Smileys & People",
    icon: "\u{1F600}",
    emojis: [
      { emoji: "\u{1F600}", name: "Grinning face", keywords: ["happy", "smile"] },
      { emoji: "\u{1F603}", name: "Smiley", keywords: ["happy", "joy"] },
      { emoji: "\u{1F604}", name: "Smile", keywords: ["happy"] },
      { emoji: "\u{1F601}", name: "Beaming face", keywords: ["grin"] },
      { emoji: "\u{1F606}", name: "Laughing", keywords: ["satisfied"] },
      { emoji: "\u{1F605}", name: "Sweat smile", keywords: ["hot"] },
      { emoji: "\u{1F923}", name: "ROFL", keywords: ["rolling", "laugh"] },
      { emoji: "\u{1F602}", name: "Joy", keywords: ["tears", "laugh", "crying"] },
      { emoji: "\u{1F642}", name: "Slightly smiling", keywords: ["smile"] },
      { emoji: "\u{1F643}", name: "Upside down", keywords: ["silly"] },
      { emoji: "\u{1FAE0}", name: "Melting face", keywords: ["melt"] },
      { emoji: "\u{1F609}", name: "Wink", keywords: ["flirt"] },
      { emoji: "\u{1F60A}", name: "Blush", keywords: ["happy", "shy"] },
      { emoji: "\u{1F607}", name: "Innocent", keywords: ["angel", "halo"] },
      { emoji: "\u{1F970}", name: "Smiling with hearts", keywords: ["love", "adore"] },
      { emoji: "\u{1F60D}", name: "Heart eyes", keywords: ["love", "crush"] },
      { emoji: "\u{1F929}", name: "Star struck", keywords: ["wow", "amazing"] },
      { emoji: "\u{1F618}", name: "Kissing heart", keywords: ["love", "kiss"] },
      { emoji: "\u{1F617}", name: "Kissing", keywords: ["kiss"] },
      { emoji: "\u{1F61A}", name: "Kissing closed eyes", keywords: ["kiss"] },
      { emoji: "\u{1F619}", name: "Kissing smiling eyes", keywords: ["kiss"] },
      { emoji: "\u{1F60B}", name: "Yum", keywords: ["delicious", "tongue"] },
      { emoji: "\u{1F61C}", name: "Winking tongue", keywords: ["playful"] },
      { emoji: "\u{1F61D}", name: "Squinting tongue", keywords: ["playful"] },
      { emoji: "\u{1F911}", name: "Money mouth", keywords: ["rich", "dollar"] },
      { emoji: "\u{1F917}", name: "Hugging", keywords: ["hug", "warm"] },
      { emoji: "\u{1F92D}", name: "Hand over mouth", keywords: ["oops", "shy"] },
      { emoji: "\u{1F92B}", name: "Shushing", keywords: ["quiet", "secret"] },
      { emoji: "\u{1F914}", name: "Thinking", keywords: ["hmm", "consider"] },
      { emoji: "\u{1F910}", name: "Zipper mouth", keywords: ["quiet", "secret"] },
      { emoji: "\u{1F928}", name: "Raised eyebrow", keywords: ["skeptical"] },
      { emoji: "\u{1F610}", name: "Neutral", keywords: ["meh", "blank"] },
      { emoji: "\u{1F611}", name: "Expressionless", keywords: ["blank"] },
      { emoji: "\u{1F636}", name: "No mouth", keywords: ["silent"] },
      { emoji: "\u{1F60F}", name: "Smirk", keywords: ["smug", "sly"] },
      { emoji: "\u{1F612}", name: "Unamused", keywords: ["dissatisfied"] },
      { emoji: "\u{1F644}", name: "Eye roll", keywords: ["annoyed"] },
      { emoji: "\u{1F62C}", name: "Grimacing", keywords: ["awkward"] },
      { emoji: "\u{1F62E}\u{200D}\u{1F4A8}", name: "Exhaling", keywords: ["sigh", "relief"] },
      { emoji: "\u{1F925}", name: "Lying", keywords: ["pinocchio"] },
      { emoji: "\u{1F60C}", name: "Relieved", keywords: ["relaxed", "content"] },
      { emoji: "\u{1F614}", name: "Pensive", keywords: ["sad", "thoughtful"] },
      { emoji: "\u{1F62A}", name: "Sleepy", keywords: ["tired"] },
      { emoji: "\u{1F924}", name: "Drooling", keywords: ["yummy"] },
      { emoji: "\u{1F634}", name: "Sleeping", keywords: ["zzz"] },
      { emoji: "\u{1F637}", name: "Mask", keywords: ["sick", "ill"] },
      { emoji: "\u{1F912}", name: "Thermometer", keywords: ["sick", "fever"] },
      { emoji: "\u{1F915}", name: "Bandage", keywords: ["hurt", "injured"] },
      { emoji: "\u{1F922}", name: "Nauseated", keywords: ["sick", "gross"] },
      { emoji: "\u{1F92E}", name: "Vomiting", keywords: ["sick"] },
      { emoji: "\u{1F927}", name: "Sneezing", keywords: ["achoo", "sick"] },
      { emoji: "\u{1F975}", name: "Hot face", keywords: ["warm", "sweating"] },
      { emoji: "\u{1F976}", name: "Cold face", keywords: ["freezing"] },
      { emoji: "\u{1F974}", name: "Woozy", keywords: ["dizzy", "drunk"] },
      { emoji: "\u{1F635}", name: "Dizzy face", keywords: ["dazed"] },
      { emoji: "\u{1F92F}", name: "Mind blown", keywords: ["shocked", "exploding"] },
      { emoji: "\u{1F920}", name: "Cowboy", keywords: ["western", "hat"] },
      { emoji: "\u{1F973}", name: "Party face", keywords: ["celebrate", "birthday"] },
      { emoji: "\u{1F978}", name: "Disguised", keywords: ["spy", "incognito"] },
      { emoji: "\u{1F60E}", name: "Sunglasses", keywords: ["cool"] },
      { emoji: "\u{1F913}", name: "Nerd", keywords: ["geek", "glasses"] },
      { emoji: "\u{1F9D0}", name: "Monocle", keywords: ["fancy", "curious"] },
      { emoji: "\u{1F615}", name: "Confused", keywords: ["puzzled"] },
      { emoji: "\u{1FAE4}", name: "Dotted line face", keywords: ["invisible"] },
      { emoji: "\u{1F61F}", name: "Worried", keywords: ["anxious", "nervous"] },
      { emoji: "\u{1F641}", name: "Slightly frowning", keywords: ["sad"] },
      { emoji: "\u{1F62E}", name: "Open mouth", keywords: ["surprised"] },
      { emoji: "\u{1F62F}", name: "Hushed", keywords: ["surprised", "wow"] },
      { emoji: "\u{1F632}", name: "Astonished", keywords: ["amazed", "gasp"] },
      { emoji: "\u{1F633}", name: "Flushed", keywords: ["embarrassed", "shy"] },
      { emoji: "\u{1F97A}", name: "Pleading", keywords: ["puppy eyes", "beg"] },
      { emoji: "\u{1F979}", name: "Holding back tears", keywords: ["sad"] },
      { emoji: "\u{1F626}", name: "Frowning open mouth", keywords: ["anguish"] },
      { emoji: "\u{1F627}", name: "Anguished", keywords: ["stunned"] },
      { emoji: "\u{1F628}", name: "Fearful", keywords: ["scared"] },
      { emoji: "\u{1F630}", name: "Anxious sweat", keywords: ["nervous"] },
      { emoji: "\u{1F625}", name: "Sad relieved", keywords: ["phew", "sweat"] },
      { emoji: "\u{1F622}", name: "Crying", keywords: ["sad", "tear"] },
      { emoji: "\u{1F62D}", name: "Sobbing", keywords: ["cry", "sad"] },
      { emoji: "\u{1F631}", name: "Screaming", keywords: ["scared", "horror"] },
      { emoji: "\u{1F616}", name: "Confounded", keywords: ["quiver"] },
      { emoji: "\u{1F623}", name: "Persevering", keywords: ["struggle"] },
      { emoji: "\u{1F61E}", name: "Disappointed", keywords: ["sad"] },
      { emoji: "\u{1F613}", name: "Downcast sweat", keywords: ["hard work"] },
      { emoji: "\u{1F629}", name: "Weary", keywords: ["tired", "frustrated"] },
      { emoji: "\u{1F62B}", name: "Tired", keywords: ["exhausted"] },
      { emoji: "\u{1F624}", name: "Huffing", keywords: ["angry", "triumph"] },
      { emoji: "\u{1F621}", name: "Pouting", keywords: ["angry", "rage"] },
      { emoji: "\u{1F620}", name: "Angry", keywords: ["mad"] },
      { emoji: "\u{1F92C}", name: "Swearing", keywords: ["cursing", "angry"] },
      { emoji: "\u{1F608}", name: "Smiling devil", keywords: ["evil", "horns"] },
      { emoji: "\u{1F47F}", name: "Angry devil", keywords: ["evil"] },
      { emoji: "\u{1F480}", name: "Skull", keywords: ["dead", "death"] },
      { emoji: "\u{1F4A9}", name: "Poop", keywords: ["poo", "shit"] },
      { emoji: "\u{1F921}", name: "Clown", keywords: ["funny"] },
      { emoji: "\u{1F47B}", name: "Ghost", keywords: ["halloween", "boo"] },
      { emoji: "\u{1F47D}", name: "Alien", keywords: ["ufo", "space"] },
      { emoji: "\u{1F916}", name: "Robot", keywords: ["bot", "tech"] },
      { emoji: "\u{1F63A}", name: "Grinning cat", keywords: ["happy"] },
      { emoji: "\u{1F639}", name: "Cat tears of joy", keywords: ["laugh"] },
      { emoji: "\u{1F63B}", name: "Heart eyes cat", keywords: ["love"] },
      { emoji: "\u{1F63D}", name: "Kissing cat", keywords: ["love"] },
      { emoji: "\u{1F640}", name: "Weary cat", keywords: ["scared"] },
      { emoji: "\u{1F63F}", name: "Crying cat", keywords: ["sad"] },
      { emoji: "\u{1F63E}", name: "Pouting cat", keywords: ["angry"] },
    ],
  },
  {
    id: "gestures",
    name: "Hands & Gestures",
    icon: "\u{1F44B}",
    emojis: [
      { emoji: "\u{1F44B}", name: "Wave", keywords: ["hi", "hello", "goodbye"] },
      { emoji: "\u{1F91A}", name: "Raised back of hand", keywords: ["stop"] },
      { emoji: "\u{1F590}\u{FE0F}", name: "Hand with fingers splayed", keywords: ["high five"] },
      { emoji: "\u{270B}", name: "Raised hand", keywords: ["stop", "high five"] },
      { emoji: "\u{1F596}", name: "Vulcan salute", keywords: ["spock", "star trek"] },
      { emoji: "\u{1FAF1}", name: "Rightwards hand", keywords: ["point"] },
      { emoji: "\u{1FAF2}", name: "Leftwards hand", keywords: ["point"] },
      { emoji: "\u{1FAF3}", name: "Palm down hand", keywords: ["dismiss"] },
      { emoji: "\u{1FAF4}", name: "Palm up hand", keywords: ["offer"] },
      { emoji: "\u{1F44C}", name: "OK hand", keywords: ["perfect", "okay"] },
      { emoji: "\u{1F90C}", name: "Pinched fingers", keywords: ["italian"] },
      { emoji: "\u{1F90F}", name: "Pinching hand", keywords: ["small", "tiny"] },
      { emoji: "\u{270C}\u{FE0F}", name: "Victory hand", keywords: ["peace", "two"] },
      { emoji: "\u{1F91E}", name: "Crossed fingers", keywords: ["luck", "hope"] },
      { emoji: "\u{1FAF0}", name: "Hand with index and thumb crossed", keywords: ["love"] },
      { emoji: "\u{1F91F}", name: "Love you gesture", keywords: ["ily"] },
      { emoji: "\u{1F918}", name: "Rock on", keywords: ["metal", "rock"] },
      { emoji: "\u{1F919}", name: "Call me hand", keywords: ["shaka"] },
      { emoji: "\u{1F448}", name: "Point left", keywords: ["direction"] },
      { emoji: "\u{1F449}", name: "Point right", keywords: ["direction"] },
      { emoji: "\u{1F446}", name: "Point up", keywords: ["direction"] },
      { emoji: "\u{1F447}", name: "Point down", keywords: ["direction"] },
      { emoji: "\u{261D}\u{FE0F}", name: "Index pointing up", keywords: ["one"] },
      { emoji: "\u{1FAF5}", name: "Index pointing at viewer", keywords: ["you"] },
      { emoji: "\u{1F44D}", name: "Thumbs up", keywords: ["yes", "good", "like", "+1"] },
      { emoji: "\u{1F44E}", name: "Thumbs down", keywords: ["no", "bad", "dislike", "-1"] },
      { emoji: "\u{270A}", name: "Raised fist", keywords: ["power", "punch"] },
      { emoji: "\u{1F44A}", name: "Fist bump", keywords: ["punch", "bro"] },
      { emoji: "\u{1F91B}", name: "Left fist", keywords: ["fist bump"] },
      { emoji: "\u{1F91C}", name: "Right fist", keywords: ["fist bump"] },
      { emoji: "\u{1F44F}", name: "Clapping", keywords: ["applause", "bravo", "clap"] },
      { emoji: "\u{1F64C}", name: "Raising hands", keywords: ["hooray", "celebrate"] },
      { emoji: "\u{1FAF6}", name: "Heart hands", keywords: ["love"] },
      { emoji: "\u{1F450}", name: "Open hands", keywords: ["jazz hands"] },
      { emoji: "\u{1F932}", name: "Palms up together", keywords: ["prayer", "please"] },
      { emoji: "\u{1F91D}", name: "Handshake", keywords: ["deal", "agreement"] },
      { emoji: "\u{1F64F}", name: "Folded hands", keywords: ["pray", "please", "thanks"] },
      { emoji: "\u{270D}\u{FE0F}", name: "Writing hand", keywords: ["write"] },
      { emoji: "\u{1F485}", name: "Nail polish", keywords: ["beauty", "nails"] },
      { emoji: "\u{1F933}", name: "Selfie", keywords: ["phone", "camera"] },
      { emoji: "\u{1F4AA}", name: "Flexed biceps", keywords: ["strong", "muscle", "arm"] },
    ],
  },
  {
    id: "work",
    name: "Getting Work Done",
    icon: "\u{2705}",
    emojis: [
      { emoji: "\u{2705}", name: "Check mark", keywords: ["done", "complete", "yes"] },
      { emoji: "\u{274C}", name: "Cross mark", keywords: ["no", "wrong", "delete"] },
      { emoji: "\u{2714}\u{FE0F}", name: "Check mark button", keywords: ["done", "approve"] },
      { emoji: "\u{274E}", name: "Cross mark button", keywords: ["no"] },
      { emoji: "\u{1F4AF}", name: "100", keywords: ["perfect", "score", "hundred"] },
      { emoji: "\u{1F44D}", name: "Thumbs up", keywords: ["approve", "yes", "+1"] },
      { emoji: "\u{1F44E}", name: "Thumbs down", keywords: ["disapprove", "no", "-1"] },
      { emoji: "\u{1F44F}", name: "Clapping", keywords: ["bravo", "well done", "applause"] },
      { emoji: "\u{1F4AA}", name: "Strong", keywords: ["muscle", "flex", "power"] },
      { emoji: "\u{1F3AF}", name: "Bullseye", keywords: ["target", "goal", "dart"] },
      { emoji: "\u{1F680}", name: "Rocket", keywords: ["launch", "ship", "fast"] },
      { emoji: "\u{1F525}", name: "Fire", keywords: ["hot", "lit", "flame"] },
      { emoji: "\u{26A1}", name: "Zap", keywords: ["lightning", "fast", "electric"] },
      { emoji: "\u{2B50}", name: "Star", keywords: ["gold", "favorite"] },
      { emoji: "\u{1F31F}", name: "Glowing star", keywords: ["sparkle", "shine"] },
      { emoji: "\u{2728}", name: "Sparkles", keywords: ["magic", "clean", "new"] },
      { emoji: "\u{1F4A1}", name: "Light bulb", keywords: ["idea", "insight"] },
      { emoji: "\u{1F4AC}", name: "Speech bubble", keywords: ["comment", "talk"] },
      { emoji: "\u{1F4AD}", name: "Thought balloon", keywords: ["think"] },
      { emoji: "\u{1F4CC}", name: "Pushpin", keywords: ["pin", "location"] },
      { emoji: "\u{1F4CB}", name: "Clipboard", keywords: ["list", "paste"] },
      { emoji: "\u{1F4DD}", name: "Memo", keywords: ["note", "write", "pencil"] },
      { emoji: "\u{1F4C8}", name: "Chart increasing", keywords: ["growth", "up", "graph"] },
      { emoji: "\u{1F4C9}", name: "Chart decreasing", keywords: ["down", "loss", "graph"] },
      { emoji: "\u{1F4CA}", name: "Bar chart", keywords: ["stats", "graph"] },
      { emoji: "\u{1F4C5}", name: "Calendar", keywords: ["date", "schedule"] },
      { emoji: "\u{23F0}", name: "Alarm clock", keywords: ["time", "wake", "deadline"] },
      { emoji: "\u{23F3}", name: "Hourglass flowing", keywords: ["time", "wait"] },
      { emoji: "\u{1F6A8}", name: "Rotating light", keywords: ["alert", "urgent", "emergency"] },
      { emoji: "\u{26A0}\u{FE0F}", name: "Warning", keywords: ["caution", "alert"] },
      { emoji: "\u{1F6AB}", name: "Prohibited", keywords: ["no", "blocked", "forbidden"] },
      { emoji: "\u{1F512}", name: "Locked", keywords: ["secure", "private"] },
      { emoji: "\u{1F513}", name: "Unlocked", keywords: ["open", "public"] },
      { emoji: "\u{1F3C6}", name: "Trophy", keywords: ["win", "champion", "award"] },
      { emoji: "\u{1F3C5}", name: "Medal", keywords: ["award", "achievement"] },
      { emoji: "\u{1F396}\u{FE0F}", name: "Military medal", keywords: ["honor", "badge"] },
      { emoji: "\u{1F389}", name: "Party popper", keywords: ["celebrate", "tada", "congrats"] },
      { emoji: "\u{1F38A}", name: "Confetti ball", keywords: ["celebrate"] },
      { emoji: "\u{1F381}", name: "Gift", keywords: ["present", "birthday"] },
      { emoji: "\u{1F4E7}", name: "Email", keywords: ["mail", "envelope"] },
      { emoji: "\u{1F517}", name: "Link", keywords: ["url", "chain"] },
      { emoji: "\u{1F4CE}", name: "Paperclip", keywords: ["attach", "attachment"] },
      { emoji: "\u{1F4E2}", name: "Loudspeaker", keywords: ["announcement", "volume"] },
      { emoji: "\u{1F514}", name: "Bell", keywords: ["notification", "alert"] },
      { emoji: "\u{1F4F1}", name: "Mobile phone", keywords: ["cell", "iphone"] },
      { emoji: "\u{1F4BB}", name: "Laptop", keywords: ["computer", "pc"] },
      { emoji: "\u{2699}\u{FE0F}", name: "Gear", keywords: ["settings", "config"] },
      { emoji: "\u{1F527}", name: "Wrench", keywords: ["tool", "fix"] },
      { emoji: "\u{1F6E0}\u{FE0F}", name: "Hammer and wrench", keywords: ["tools", "build"] },
      { emoji: "\u{1F9EA}", name: "Test tube", keywords: ["science", "test", "experiment"] },
    ],
  },
  {
    id: "nature",
    name: "Animals & Nature",
    icon: "\u{1F43E}",
    emojis: [
      { emoji: "\u{1F436}", name: "Dog face", keywords: ["puppy", "pet"] },
      { emoji: "\u{1F431}", name: "Cat face", keywords: ["kitten", "pet"] },
      { emoji: "\u{1F42D}", name: "Mouse face", keywords: ["rodent"] },
      { emoji: "\u{1F439}", name: "Hamster", keywords: ["pet", "cute"] },
      { emoji: "\u{1F430}", name: "Rabbit face", keywords: ["bunny"] },
      { emoji: "\u{1F98A}", name: "Fox", keywords: ["animal"] },
      { emoji: "\u{1F43B}", name: "Bear", keywords: ["animal"] },
      { emoji: "\u{1F43C}", name: "Panda", keywords: ["animal", "cute"] },
      { emoji: "\u{1F428}", name: "Koala", keywords: ["animal", "cute"] },
      { emoji: "\u{1F42F}", name: "Tiger face", keywords: ["animal"] },
      { emoji: "\u{1F981}", name: "Lion", keywords: ["animal", "king"] },
      { emoji: "\u{1F42E}", name: "Cow face", keywords: ["animal", "moo"] },
      { emoji: "\u{1F437}", name: "Pig face", keywords: ["animal", "oink"] },
      { emoji: "\u{1F438}", name: "Frog", keywords: ["animal", "toad"] },
      { emoji: "\u{1F435}", name: "Monkey face", keywords: ["animal"] },
      { emoji: "\u{1F649}", name: "Hear no evil monkey", keywords: ["animal"] },
      { emoji: "\u{1F648}", name: "See no evil monkey", keywords: ["animal", "shy"] },
      { emoji: "\u{1F64A}", name: "Speak no evil monkey", keywords: ["animal", "quiet"] },
      { emoji: "\u{1F412}", name: "Monkey", keywords: ["animal"] },
      { emoji: "\u{1F414}", name: "Chicken", keywords: ["bird", "poultry"] },
      { emoji: "\u{1F427}", name: "Penguin", keywords: ["bird", "cold"] },
      { emoji: "\u{1F426}", name: "Bird", keywords: ["tweet", "fly"] },
      { emoji: "\u{1F985}", name: "Eagle", keywords: ["bird", "freedom"] },
      { emoji: "\u{1F989}", name: "Owl", keywords: ["bird", "wisdom"] },
      { emoji: "\u{1F987}", name: "Bat", keywords: ["animal", "night"] },
      { emoji: "\u{1F43A}", name: "Wolf", keywords: ["animal", "howl"] },
      { emoji: "\u{1F417}", name: "Boar", keywords: ["animal"] },
      { emoji: "\u{1F434}", name: "Horse face", keywords: ["animal"] },
      { emoji: "\u{1F984}", name: "Unicorn", keywords: ["horse", "magic", "rainbow"] },
      { emoji: "\u{1F40D}", name: "Snake", keywords: ["reptile"] },
      { emoji: "\u{1F422}", name: "Turtle", keywords: ["slow", "reptile"] },
      { emoji: "\u{1F419}", name: "Octopus", keywords: ["sea", "tentacle"] },
      { emoji: "\u{1F41D}", name: "Honeybee", keywords: ["insect", "bee"] },
      { emoji: "\u{1F98B}", name: "Butterfly", keywords: ["insect", "beautiful"] },
      { emoji: "\u{1F41B}", name: "Bug", keywords: ["insect"] },
      { emoji: "\u{1F41C}", name: "Ant", keywords: ["insect"] },
      { emoji: "\u{1F339}", name: "Rose", keywords: ["flower", "love", "red"] },
      { emoji: "\u{1F33B}", name: "Sunflower", keywords: ["flower", "yellow"] },
      { emoji: "\u{1F337}", name: "Tulip", keywords: ["flower"] },
      { emoji: "\u{1F338}", name: "Cherry blossom", keywords: ["flower", "spring"] },
      { emoji: "\u{1F340}", name: "Four leaf clover", keywords: ["lucky", "luck"] },
      { emoji: "\u{1F332}", name: "Evergreen tree", keywords: ["pine", "nature"] },
      { emoji: "\u{1F333}", name: "Deciduous tree", keywords: ["nature"] },
      { emoji: "\u{1F334}", name: "Palm tree", keywords: ["beach", "tropical"] },
      { emoji: "\u{1F335}", name: "Cactus", keywords: ["desert", "plant"] },
      { emoji: "\u{1F31E}", name: "Sun with face", keywords: ["sunny"] },
      { emoji: "\u{1F31D}", name: "Full moon with face", keywords: ["night"] },
      { emoji: "\u{1F308}", name: "Rainbow", keywords: ["colorful", "weather"] },
      { emoji: "\u{26C5}", name: "Partly cloudy", keywords: ["weather"] },
      { emoji: "\u{2744}\u{FE0F}", name: "Snowflake", keywords: ["cold", "winter", "snow"] },
    ],
  },
  {
    id: "food",
    name: "Food & Drink",
    icon: "\u{1F354}",
    emojis: [
      { emoji: "\u{1F34E}", name: "Red apple", keywords: ["fruit", "healthy"] },
      { emoji: "\u{1F34A}", name: "Orange", keywords: ["fruit", "citrus"] },
      { emoji: "\u{1F34B}", name: "Lemon", keywords: ["fruit", "citrus", "sour"] },
      { emoji: "\u{1F34C}", name: "Banana", keywords: ["fruit"] },
      { emoji: "\u{1F349}", name: "Watermelon", keywords: ["fruit", "summer"] },
      { emoji: "\u{1F347}", name: "Grapes", keywords: ["fruit", "wine"] },
      { emoji: "\u{1F353}", name: "Strawberry", keywords: ["fruit", "berry"] },
      { emoji: "\u{1FAD0}", name: "Blueberries", keywords: ["fruit", "berry"] },
      { emoji: "\u{1F351}", name: "Peach", keywords: ["fruit"] },
      { emoji: "\u{1F352}", name: "Cherries", keywords: ["fruit"] },
      { emoji: "\u{1F96D}", name: "Mango", keywords: ["fruit", "tropical"] },
      { emoji: "\u{1F34D}", name: "Pineapple", keywords: ["fruit", "tropical"] },
      { emoji: "\u{1F951}", name: "Avocado", keywords: ["fruit", "guacamole"] },
      { emoji: "\u{1F955}", name: "Carrot", keywords: ["vegetable"] },
      { emoji: "\u{1F33D}", name: "Corn", keywords: ["vegetable", "maize"] },
      { emoji: "\u{1F336}\u{FE0F}", name: "Hot pepper", keywords: ["spicy", "chili"] },
      { emoji: "\u{1F950}", name: "Croissant", keywords: ["bread", "french"] },
      { emoji: "\u{1F35E}", name: "Bread", keywords: ["loaf", "toast"] },
      { emoji: "\u{1F354}", name: "Hamburger", keywords: ["burger", "fast food"] },
      { emoji: "\u{1F355}", name: "Pizza", keywords: ["food", "italian"] },
      { emoji: "\u{1F32E}", name: "Taco", keywords: ["mexican", "food"] },
      { emoji: "\u{1F32F}", name: "Burrito", keywords: ["mexican", "food"] },
      { emoji: "\u{1F373}", name: "Cooking", keywords: ["egg", "frying pan"] },
      { emoji: "\u{1F372}", name: "Pot of food", keywords: ["stew", "soup"] },
      { emoji: "\u{1F363}", name: "Sushi", keywords: ["japanese", "fish"] },
      { emoji: "\u{1F35C}", name: "Ramen", keywords: ["noodles", "soup"] },
      { emoji: "\u{1F370}", name: "Cake", keywords: ["dessert", "birthday"] },
      { emoji: "\u{1F382}", name: "Birthday cake", keywords: ["party", "celebrate"] },
      { emoji: "\u{1F36B}", name: "Chocolate bar", keywords: ["candy", "sweet"] },
      { emoji: "\u{1F369}", name: "Doughnut", keywords: ["donut", "sweet"] },
      { emoji: "\u{1F36A}", name: "Cookie", keywords: ["sweet", "snack"] },
      { emoji: "\u{1F366}", name: "Ice cream", keywords: ["soft serve", "dessert"] },
      { emoji: "\u{2615}", name: "Coffee", keywords: ["hot", "drink", "tea", "cafe"] },
      { emoji: "\u{1F375}", name: "Tea", keywords: ["hot", "drink", "green tea"] },
      { emoji: "\u{1F37A}", name: "Beer", keywords: ["drink", "bar"] },
      { emoji: "\u{1F37B}", name: "Beers", keywords: ["cheers", "toast"] },
      { emoji: "\u{1F377}", name: "Wine glass", keywords: ["drink", "red wine"] },
      { emoji: "\u{1F378}", name: "Cocktail", keywords: ["drink", "martini"] },
      { emoji: "\u{1F379}", name: "Tropical drink", keywords: ["cocktail", "summer"] },
      { emoji: "\u{1F9C3}", name: "Beverage box", keywords: ["juice", "drink"] },
    ],
  },
  {
    id: "travel",
    name: "Travel & Places",
    icon: "\u{2708}\u{FE0F}",
    emojis: [
      { emoji: "\u{1F697}", name: "Automobile", keywords: ["car", "vehicle"] },
      { emoji: "\u{1F695}", name: "Taxi", keywords: ["cab", "uber"] },
      { emoji: "\u{1F68C}", name: "Bus", keywords: ["vehicle", "transit"] },
      { emoji: "\u{1F691}", name: "Ambulance", keywords: ["hospital", "emergency"] },
      { emoji: "\u{1F692}", name: "Fire engine", keywords: ["fire truck"] },
      { emoji: "\u{1F693}", name: "Police car", keywords: ["law", "cop"] },
      { emoji: "\u{1F3CE}\u{FE0F}", name: "Racing car", keywords: ["speed", "race"] },
      { emoji: "\u{1F6B2}", name: "Bicycle", keywords: ["bike", "cycling"] },
      { emoji: "\u{2708}\u{FE0F}", name: "Airplane", keywords: ["flight", "travel"] },
      { emoji: "\u{1F681}", name: "Helicopter", keywords: ["flight", "vehicle"] },
      { emoji: "\u{1F6F8}", name: "Flying saucer", keywords: ["ufo", "alien"] },
      { emoji: "\u{1F680}", name: "Rocket", keywords: ["space", "launch"] },
      { emoji: "\u{1F6A2}", name: "Ship", keywords: ["boat", "cruise"] },
      { emoji: "\u{1F3E0}", name: "House", keywords: ["home", "building"] },
      { emoji: "\u{1F3E2}", name: "Office building", keywords: ["work", "company"] },
      { emoji: "\u{1F3EB}", name: "School", keywords: ["education", "building"] },
      { emoji: "\u{1F3E5}", name: "Hospital", keywords: ["medical", "health"] },
      { emoji: "\u{1F3DB}\u{FE0F}", name: "Classical building", keywords: ["bank", "museum"] },
      { emoji: "\u{26EA}", name: "Church", keywords: ["religion", "worship"] },
      { emoji: "\u{1F5FC}", name: "Tokyo tower", keywords: ["japan"] },
      { emoji: "\u{1F5FD}", name: "Statue of Liberty", keywords: ["usa", "new york"] },
      { emoji: "\u{1F30D}", name: "Globe Europe-Africa", keywords: ["earth", "world"] },
      { emoji: "\u{1F30E}", name: "Globe Americas", keywords: ["earth", "world"] },
      { emoji: "\u{1F30F}", name: "Globe Asia-Australia", keywords: ["earth", "world"] },
      { emoji: "\u{1F3D4}\u{FE0F}", name: "Snow-capped mountain", keywords: ["nature"] },
      { emoji: "\u{1F3D6}\u{FE0F}", name: "Beach with umbrella", keywords: ["vacation", "sand"] },
      { emoji: "\u{1F3DD}\u{FE0F}", name: "Desert island", keywords: ["tropical", "palm"] },
      { emoji: "\u{1F307}", name: "Sunset", keywords: ["evening", "city"] },
      { emoji: "\u{1F303}", name: "Night with stars", keywords: ["city", "evening"] },
      { emoji: "\u{1F30C}", name: "Milky Way", keywords: ["galaxy", "space", "stars"] },
    ],
  },
  {
    id: "objects",
    name: "Objects",
    icon: "\u{1F4A1}",
    emojis: [
      { emoji: "\u{231A}", name: "Watch", keywords: ["time", "clock"] },
      { emoji: "\u{1F4F1}", name: "Mobile phone", keywords: ["cell", "smartphone"] },
      { emoji: "\u{1F4BB}", name: "Laptop", keywords: ["computer", "pc"] },
      { emoji: "\u{1F5A5}\u{FE0F}", name: "Desktop computer", keywords: ["monitor", "pc"] },
      { emoji: "\u{1F4F7}", name: "Camera", keywords: ["photo", "picture"] },
      { emoji: "\u{1F4FA}", name: "Television", keywords: ["tv", "screen"] },
      { emoji: "\u{1F3A5}", name: "Movie camera", keywords: ["film", "video"] },
      { emoji: "\u{1F50D}", name: "Magnifying glass left", keywords: ["search", "find"] },
      { emoji: "\u{1F4A3}", name: "Bomb", keywords: ["explosive", "boom"] },
      { emoji: "\u{1F52E}", name: "Crystal ball", keywords: ["magic", "fortune"] },
      { emoji: "\u{1F4B0}", name: "Money bag", keywords: ["dollar", "rich", "cash"] },
      { emoji: "\u{1F4B5}", name: "Dollar", keywords: ["money", "cash"] },
      { emoji: "\u{1F4B3}", name: "Credit card", keywords: ["payment", "money"] },
      { emoji: "\u{1F4E6}", name: "Package", keywords: ["box", "delivery", "shipping"] },
      { emoji: "\u{1F4EC}", name: "Mailbox with mail", keywords: ["email", "inbox"] },
      { emoji: "\u{1F4E9}", name: "Envelope with arrow", keywords: ["email", "send"] },
      { emoji: "\u{1F4DC}", name: "Scroll", keywords: ["document", "paper"] },
      { emoji: "\u{1F4DA}", name: "Books", keywords: ["reading", "library"] },
      { emoji: "\u{1F4D6}", name: "Open book", keywords: ["reading", "study"] },
      { emoji: "\u{1F4D3}", name: "Notebook", keywords: ["notes", "journal"] },
      { emoji: "\u{270F}\u{FE0F}", name: "Pencil", keywords: ["write", "edit"] },
      { emoji: "\u{1F58A}\u{FE0F}", name: "Pen", keywords: ["write"] },
      { emoji: "\u{1F3A8}", name: "Artist palette", keywords: ["art", "paint", "design"] },
      { emoji: "\u{1F3B5}", name: "Musical note", keywords: ["music", "melody"] },
      { emoji: "\u{1F3B6}", name: "Musical notes", keywords: ["music", "melody"] },
      { emoji: "\u{1F3A4}", name: "Microphone", keywords: ["sing", "karaoke"] },
      { emoji: "\u{1F3AE}", name: "Video game", keywords: ["gaming", "controller"] },
      { emoji: "\u{1F3B2}", name: "Game die", keywords: ["dice", "random"] },
      { emoji: "\u{1F511}", name: "Key", keywords: ["lock", "password", "security"] },
      { emoji: "\u{1F5D1}\u{FE0F}", name: "Wastebasket", keywords: ["trash", "delete", "bin"] },
    ],
  },
  {
    id: "symbols",
    name: "Symbols",
    icon: "\u{2764}\u{FE0F}",
    emojis: [
      { emoji: "\u{2764}\u{FE0F}", name: "Red heart", keywords: ["love"] },
      { emoji: "\u{1F9E1}", name: "Orange heart", keywords: ["love"] },
      { emoji: "\u{1F49B}", name: "Yellow heart", keywords: ["love"] },
      { emoji: "\u{1F49A}", name: "Green heart", keywords: ["love"] },
      { emoji: "\u{1F499}", name: "Blue heart", keywords: ["love"] },
      { emoji: "\u{1F49C}", name: "Purple heart", keywords: ["love"] },
      { emoji: "\u{1F5A4}", name: "Black heart", keywords: ["love", "evil"] },
      { emoji: "\u{1F90D}", name: "White heart", keywords: ["love", "pure"] },
      { emoji: "\u{1F494}", name: "Broken heart", keywords: ["sad", "breakup"] },
      { emoji: "\u{2763}\u{FE0F}", name: "Heart exclamation", keywords: ["love"] },
      { emoji: "\u{1F495}", name: "Two hearts", keywords: ["love", "pair"] },
      { emoji: "\u{1F49E}", name: "Revolving hearts", keywords: ["love", "romantic"] },
      { emoji: "\u{1F493}", name: "Beating heart", keywords: ["love", "pulse"] },
      { emoji: "\u{1F496}", name: "Sparkling heart", keywords: ["love", "shine"] },
      { emoji: "\u{1F497}", name: "Growing heart", keywords: ["love"] },
      { emoji: "\u{1F498}", name: "Heart with arrow", keywords: ["love", "cupid"] },
      { emoji: "\u{1F4A2}", name: "Anger symbol", keywords: ["angry", "mad"] },
      { emoji: "\u{1F4A5}", name: "Collision", keywords: ["boom", "crash", "bang"] },
      { emoji: "\u{1F4AB}", name: "Dizzy", keywords: ["star", "sparkle"] },
      { emoji: "\u{1F4A6}", name: "Sweat droplets", keywords: ["water", "work"] },
      { emoji: "\u{1F4A8}", name: "Dashing away", keywords: ["wind", "fast"] },
      { emoji: "\u{1F4AC}", name: "Speech bubble", keywords: ["comment", "chat"] },
      { emoji: "\u{1F441}\u{FE0F}\u{200D}\u{1F5E8}\u{FE0F}", name: "Eye in speech bubble", keywords: ["witness"] },
      { emoji: "\u{1F440}", name: "Eyes", keywords: ["look", "see", "watch"] },
      { emoji: "\u{1F4F4}", name: "Mobile phone off", keywords: ["mute", "silent"] },
      { emoji: "\u{1F4F3}", name: "Vibration mode", keywords: ["phone", "silent"] },
      { emoji: "\u{2757}", name: "Exclamation mark", keywords: ["important", "bang"] },
      { emoji: "\u{2753}", name: "Question mark", keywords: ["confused"] },
      { emoji: "\u{203C}\u{FE0F}", name: "Double exclamation", keywords: ["important"] },
      { emoji: "\u{2049}\u{FE0F}", name: "Exclamation question", keywords: ["interrobang"] },
      { emoji: "\u{1F4F2}", name: "Mobile with arrow", keywords: ["phone", "call"] },
      { emoji: "\u{1F1FA}\u{1F1F8}", name: "Flag: US", keywords: ["america", "usa"] },
      { emoji: "\u{1F1EC}\u{1F1E7}", name: "Flag: UK", keywords: ["britain", "england"] },
      { emoji: "\u{1F1EE}\u{1F1F3}", name: "Flag: India", keywords: ["india"] },
      { emoji: "\u{1F1E8}\u{1F1E6}", name: "Flag: Canada", keywords: ["canada"] },
      { emoji: "\u{1F1E6}\u{1F1FA}", name: "Flag: Australia", keywords: ["australia"] },
      { emoji: "\u{1F1E9}\u{1F1EA}", name: "Flag: Germany", keywords: ["germany"] },
      { emoji: "\u{1F1EB}\u{1F1F7}", name: "Flag: France", keywords: ["france"] },
      { emoji: "\u{1F1EF}\u{1F1F5}", name: "Flag: Japan", keywords: ["japan"] },
      { emoji: "\u{1F1E7}\u{1F1F7}", name: "Flag: Brazil", keywords: ["brazil"] },
    ],
  },
  {
    id: "numbers",
    name: "Numbers & Letters",
    icon: "\u{0031}\u{FE0F}\u{20E3}",
    emojis: [
      { emoji: "\u{0030}\u{FE0F}\u{20E3}", name: "Keycap 0", keywords: ["zero", "number"] },
      { emoji: "\u{0031}\u{FE0F}\u{20E3}", name: "Keycap 1", keywords: ["one", "number"] },
      { emoji: "\u{0032}\u{FE0F}\u{20E3}", name: "Keycap 2", keywords: ["two", "number"] },
      { emoji: "\u{0033}\u{FE0F}\u{20E3}", name: "Keycap 3", keywords: ["three", "number"] },
      { emoji: "\u{0034}\u{FE0F}\u{20E3}", name: "Keycap 4", keywords: ["four", "number"] },
      { emoji: "\u{0035}\u{FE0F}\u{20E3}", name: "Keycap 5", keywords: ["five", "number"] },
      { emoji: "\u{0036}\u{FE0F}\u{20E3}", name: "Keycap 6", keywords: ["six", "number"] },
      { emoji: "\u{0037}\u{FE0F}\u{20E3}", name: "Keycap 7", keywords: ["seven", "number"] },
      { emoji: "\u{0038}\u{FE0F}\u{20E3}", name: "Keycap 8", keywords: ["eight", "number"] },
      { emoji: "\u{0039}\u{FE0F}\u{20E3}", name: "Keycap 9", keywords: ["nine", "number"] },
      { emoji: "\u{1F51F}", name: "Keycap 10", keywords: ["ten", "number"] },
      { emoji: "\u{0023}\u{FE0F}\u{20E3}", name: "Keycap #", keywords: ["hash", "number"] },
      { emoji: "\u{002A}\u{FE0F}\u{20E3}", name: "Keycap *", keywords: ["asterisk", "star"] },
      { emoji: "\u{1F520}", name: "Input Latin uppercase", keywords: ["ABCD", "letters"] },
      { emoji: "\u{1F521}", name: "Input Latin lowercase", keywords: ["abcd", "letters"] },
      { emoji: "\u{1F522}", name: "Input numbers", keywords: ["1234"] },
      { emoji: "\u{1F523}", name: "Input symbols", keywords: ["signs"] },
      { emoji: "\u{1F524}", name: "Input Latin letters", keywords: ["abc", "alphabet"] },
      { emoji: "\u{1F170}\u{FE0F}", name: "A button", keywords: ["letter"] },
      { emoji: "\u{1F171}\u{FE0F}", name: "B button", keywords: ["letter"] },
      { emoji: "\u{1F17E}\u{FE0F}", name: "O button", keywords: ["letter"] },
      { emoji: "\u{2139}\u{FE0F}", name: "Information", keywords: ["info"] },
      { emoji: "\u{1F194}", name: "ID", keywords: ["identity"] },
      { emoji: "\u{1F195}", name: "New", keywords: ["fresh"] },
      { emoji: "\u{1F197}", name: "OK", keywords: ["approve", "accept"] },
      { emoji: "\u{1F196}", name: "NG", keywords: ["no good", "bad"] },
      { emoji: "\u{1F198}", name: "SOS", keywords: ["help", "emergency"] },
      { emoji: "\u{1F199}", name: "UP!", keywords: ["update", "upgrade"] },
      { emoji: "\u{1F19A}", name: "VS", keywords: ["versus", "against"] },
      { emoji: "\u{1F192}", name: "COOL", keywords: ["nice"] },
    ],
  },
];

// Frequently used emojis storage key
const FREQUENTLY_USED_KEY = "emoji-frequently-used";
const MAX_FREQUENT = 24;

function getFrequentlyUsed(): EmojiItem[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(FREQUENTLY_USED_KEY);
    if (!data) return [];
    return JSON.parse(data) as EmojiItem[];
  } catch {
    return [];
  }
}

function trackEmojiUsage(item: EmojiItem) {
  try {
    const existing = getFrequentlyUsed();
    const filtered = existing.filter((e) => e.emoji !== item.emoji);
    const updated = [item, ...filtered].slice(0, MAX_FREQUENT);
    localStorage.setItem(FREQUENTLY_USED_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

// ─── All emojis flattened for search ──────────────────────

const ALL_EMOJIS: (EmojiItem & { category: string })[] = EMOJI_CATEGORIES.flatMap(
  (cat) => cat.emojis.map((e) => ({ ...e, category: cat.name }))
);

// ─── Component ────────────────────────────────────────────

export function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("frequent");
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);
  const [frequentlyUsed, setFrequentlyUsed] = useState<EmojiItem[]>([]);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setFrequentlyUsed(getFrequentlyUsed());
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return ALL_EMOJIS.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.keywords?.some((k) => k.includes(q))
    );
  }, [search]);

  // Handle scroll to detect active category
  const handleScroll = useCallback(() => {
    if (search || !scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    let closest = "frequent";
    let closestDist = Infinity;

    // Check frequent section first
    const freqEl = categoryRefs.current["frequent"];
    if (freqEl) {
      const dist = Math.abs(freqEl.offsetTop - scrollTop - scrollRef.current.offsetTop);
      if (dist < closestDist) {
        closestDist = dist;
        closest = "frequent";
      }
    }

    for (const cat of EMOJI_CATEGORIES) {
      const el = categoryRefs.current[cat.id];
      if (el) {
        const dist = Math.abs(el.offsetTop - scrollTop - scrollRef.current.offsetTop);
        if (dist < closestDist) {
          closestDist = dist;
          closest = cat.id;
        }
      }
    }
    setActiveCategory(closest);
  }, [search]);

  function scrollToCategory(id: string) {
    const el = categoryRefs.current[id];
    if (el && scrollRef.current) {
      const offset = el.offsetTop - scrollRef.current.offsetTop;
      scrollRef.current.scrollTo({ top: offset, behavior: "smooth" });
    }
    setActiveCategory(id);
  }

  function handleSelect(item: EmojiItem) {
    trackEmojiUsage(item);
    onSelect(item.emoji);
    onClose();
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full right-0 mb-1 z-50 w-[352px] rounded-lg border bg-popover shadow-xl flex flex-col"
      style={{ maxHeight: "420px" }}
    >
      {/* Category tabs */}
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 border-b shrink-0">
        <button
          onClick={() => { setSearch(""); scrollToCategory("frequent"); }}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded text-sm hover:bg-muted transition-colors",
            activeCategory === "frequent" && "bg-muted"
          )}
          title="Frequently Used"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setSearch(""); scrollToCategory(cat.id); }}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded text-sm hover:bg-muted transition-colors",
              activeCategory === cat.id && "bg-muted"
            )}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search all emoji"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-sm rounded-md border bg-muted/50 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
      </div>

      {/* Emoji grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 pb-1 min-h-0"
        onScroll={handleScroll}
      >
        {searchResults ? (
          // Search results
          <div className="py-1">
            <div className="text-xs font-semibold text-muted-foreground mb-1 px-0.5">
              Search Results ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No emoji found
              </div>
            ) : (
              <div className="grid grid-cols-10 gap-0">
                {searchResults.map((item) => (
                  <button
                    key={`${item.emoji}-${item.name}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    onMouseLeave={() => setHoveredEmoji(null)}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-xl"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Frequently Used */}
            {frequentlyUsed.length > 0 && (
              <div
                className="py-1"
                ref={(el) => { categoryRefs.current["frequent"] = el; }}
              >
                <div className="text-xs font-semibold text-muted-foreground mb-1 px-0.5">
                  Frequently Used
                </div>
                <div className="grid grid-cols-10 gap-0">
                  {frequentlyUsed.map((item, i) => (
                    <button
                      key={`freq-${item.emoji}-${i}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setHoveredEmoji(item)}
                      onMouseLeave={() => setHoveredEmoji(null)}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-xl"
                      title={item.name}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All categories */}
            {EMOJI_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="py-1"
                ref={(el) => { categoryRefs.current[cat.id] = el; }}
              >
                <div className="text-xs font-semibold text-muted-foreground mb-1 px-0.5">
                  {cat.name}
                </div>
                <div className="grid grid-cols-10 gap-0">
                  {cat.emojis.map((item) => (
                    <button
                      key={`${cat.id}-${item.emoji}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setHoveredEmoji(item)}
                      onMouseLeave={() => setHoveredEmoji(null)}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-xl"
                      title={item.name}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer - hovered emoji info */}
      <div className="border-t px-3 py-1.5 flex items-center gap-2 min-h-[36px] shrink-0">
        {hoveredEmoji ? (
          <>
            <span className="text-2xl">{hoveredEmoji.emoji}</span>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{hoveredEmoji.name}</div>
              {hoveredEmoji.keywords && hoveredEmoji.keywords.length > 0 && (
                <div className="text-[10px] text-muted-foreground truncate">
                  {hoveredEmoji.keywords.slice(0, 3).join(", ")}
                </div>
              )}
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Hover over an emoji to preview</span>
        )}
      </div>
    </motion.div>
  );
}
