# PETDEXTER

## Complete Wireframe, Product Architecture and Game Mechanics Specification

Build-ready product specification for a real-world social pet discovery game. Version 1.0 — July 2026.

Core promise: Meet pets. Remember them. Collect their stories.

Product principle: Every pet card is a permanent record of a real encounter, relationship, place, event, or adoption story. Cards are never destroyed through play.

# 0. Executive Product Definition

PetDexter is a camera-first social discovery game that helps people remember real pets, learn their names, connect them to pet parents, record where they met, build pet-to-pet relationships, discover pet-friendly places and events, support adoptable animals, and use their cards in quests, collections, memory games, group challenges and event leaderboards.

PetDexter is a soft identity layer, not a legal pet registration system. It connects six objects: Pet, Pet Parent, Encounter, Place, Event and Relationship.

| What PetDexter is | What PetDexter is not |
| --- | --- |
| A real-pet memory and discovery game | A game where users own or fight over other people’s pets |
| A playful calling card for pet families | A replacement for microchips, official registration or veterinary records |
| A way to connect later after an encounter | A system that exposes a pet parent’s private identity automatically |
| A place and event exploration platform | A generic social feed built around likes |
| An adoption awareness and sharing channel | A marketplace that allows unverified adoption listings |
| An event engagement engine | A pay-to-win battle game |

# 1. Product Pillars

| Pillar | User value | Primary mechanics |
| --- | --- | --- |
| Discover | Find pets, places and events in the real world | Camera capture, check-ins, maps, nearby suggestions |
| Identify | Remember a pet’s real or community identity | Name entry, AI matching, claiming, profile merging |
| Connect | Associate pets with their pet parents | QR exchange, delayed match, connection requests |
| Remember | Preserve encounters and shared history | Timelines, notes, photos, reunions, place stamps |
| Relate | Celebrate bonds between pets | Pawsome Friend, Furboo, Furever Love and other relationship types |
| Play | Use cards in non-destructive games | Quests, bingo, memory games, decks, group goals |
| Explore | Discover pet-friendly places and events | Place cards, event mode, trails, location quests |
| Support | Help adoptable pets be seen and shared | AWO collections, advocate ranks, adoption cards |
| Contribute | Grow the community map and identity graph | Add places, suggest names, identify pets, confirm matches |
| Compete | Join trusted individual and team rankings | Verified unique-pet counts, breed quests, event leaderboards |

# 2. App Information Architecture

Recommended five-tab navigation keeps the app understandable while preserving camera-first gameplay.

| Tab | Purpose | Main destinations |
| --- | --- | --- |
| Discover | Find what is happening around the user | Nearby events, pet-friendly places, active quests, community discoveries, map |
| PetDex | Browse cards and relationships | My pets, pets met, community pets, adoption pets, decks, connections |
| Meet! | Capture or exchange a pet encounter | Camera, identify pet, scan QR, check in, add place |
| Play | Use cards and participate | Quests, event mode, memory games, group challenges, leaderboards |
| Me | Identity, progress and settings | Pet family calling card, badges, inventory, privacy, notifications |

The center Meet! button remains raised and visually prominent. Places and Events live under Discover rather than becoming separate tabs.

# 3. Global Object Model

| Object | Definition | Key states |
| --- | --- | --- |
| Pet | A unique real animal identity | Owned, connected, unclaimed, community, adoption, memorial |
| Pet Parent | A registered user who controls one or more pet profiles | Public, limited, connections-only, private |
| Encounter | A dated meeting between a user and a pet | New, revisit, possible duplicate, pending match, verified |
| Place | A physical pet-friendly or pet-discovery location | Community-added, claimed business, verified, merged, archived |
| Event | A dated activation at a parent venue | Draft, published, active, ended, archived |
| Relationship | A confirmed link between two pets or a user and pet | Requested, accepted, declined, paused |
| Quest | A rule-bound challenge | Available, joined, active, completed, claimed, expired |
| Card | The user-facing representation of a pet or encounter | Unidentified, named, matched, connected, relationship-enhanced |
| Deck | A curated set of cards | Private, shareable, group, event-generated |
| Organization | Animal welfare, brand, venue or community account | Pending, verified, suspended |

# 4. Pet Identity Classes and Card Ownership Rules

| Card class | Who controls identity | How acquired | What the holder may do |
| --- | --- | --- | --- |
| My Pet | The registered pet parent | Create and verify profile | Edit identity, visibility, traits, pet family and relationships |
| Connected Pet | The real pet parent | QR exchange or confirmed backend match | View allowed profile, record encounters, request pet relationship |
| Named Discovery | No confirmed parent yet | Capture and enter a real or temporary name | Record encounters, share for identification, suggest details |
| Unidentified Discovery | No known name or parent | Capture without name | Add temporary nickname, traits and notes |
| Community Pet | Community identity with moderation | Repeatedly recognized in a public area | Contribute sightings and approved observations |
| Adoption Pet | Verified animal welfare organization | Unlock via organization or event QR | Save, share, follow and inquire; never edit identity |
| Memorial Pet | Pet parent-controlled legacy profile | Parent changes life status | Preserve memories; no active location or discovery prompts |

A user never owns another person’s pet. Their PetDex stores a relationship to the canonical pet record plus the user’s personal encounter history.

# 5. First-Time User Journey

```text
SCREEN: Welcome
[PetDexter logo]
Meet pets. Remember them. Collect their stories.
[Continue with Google] [Email] [Explore as Guest]
[ ] I agree to Terms and Privacy
```

- Guest mode allows limited local capture and browsing, but requires sign-in to connect, claim pets, join ranked quests or sync encounters.
- Onboarding should be reduced to four practical slides: Meet real pets; Remember names and places; Connect now or later; Play quests and help adoption pets.
- After sign-in, the user chooses one of three starting paths: Add My Pet, Start Discovering, or Explore Nearby.
- First-login grant: three universal discovery snacks and one friendship treat. Avoid a constant energy timer during onboarding.

# 6. Home / Discover Wireframe

```text
DISCOVER
[Search pets, places, events]
[Map/List toggle] [Distance] [Date] [Filters]

NEAR YOU
• Pet-friendly places
• Events this week
• Active location quests

TODAY'S DISCOVERY
[Suggested check-in place]
[Nearby community pet story]
[Adoption collection nearby]

[Map with place, event and quest pins]
```

- Location permission is optional; manual search remains available.
- Cards in Discover are utility-first, not a generic follower feed.
- Filters: dogs, cats, other pets, pet-friendly amenities, indoor/outdoor, free/paid, adoption, quests, date, distance and verified-only.
- Event pins visually override venue pins while an event is active, but both records remain linked.

# 7. Meet! Capture Entry Screen

```text
MEET A PET
[Live camera]

[Capture pet]   [Scan PetDex QR]
[Check in first] [Add a place]

Inventory: Universal Snack x3
Current context: Pet Summit Philippines 2027
```

The app should infer context before capture: active event, canonical place, approximate GPS area and current quest requirements.

| Entry route | Snack cost | Result |
| --- | --- | --- |
| Scan a registered user or pet QR | Free | Immediate verified connection or selected pet-family exchange |
| Capture an unknown or unconnected pet | One discovery snack | Creates or matches an encounter card |
| Capture an adoption QR collection | Free | Unlocks current adoption cards from a verified organization |
| Record a reunion with an already connected pet | Free | Adds an encounter and relationship progress |
| Manual add without a live photo | Restricted | Allowed for owned pets and approved organization imports only |

# 8. Capture and Identification Flow

```text
1. CAPTURE PHOTO
2. ON-DEVICE CHECK: Is this a real animal?
3. BACKEND MATCH: Is this a known pet?
4. ASK USER: Do you know the name?
5. SAVE ENCOUNTER NOW
6. MATCH OR CONNECTION MAY COMPLETE LATER
```

| System result | User experience | Quest count |
| --- | --- | --- |
| High-confidence registered match and public matching enabled | Show “We may know this pet” and request connection | Counts once as unique after validation |
| Possible registered match | Save as pending; notify later if confidence improves | Provisional until validated |
| Known pet already in user PetDex | Show reunion screen; append encounter | Does not count as a new unique pet |
| No match | Create named or unidentified discovery | Counts if image-quality and uniqueness checks pass |
| Likely same-day duplicate | Show “You already met this pet today” | No additional unique-pet count |
| Screen/photo spoof or no animal | Reject capture; refund snack when failure is technical | No count |

# 9. Name and Identity Prompt

```text
WHAT IS THIS PET'S NAME?
[Pet name field]
[ I don't know ]

Do you see the pet parent?
[Ask to scan QR] [Not right now]

Optional
Breed: [suggested]
Traits: [choose up to 3]
Notes: [where/how you met]
```

The user can enter a real name learned verbally even when no parent connection occurs. The card remains “Name supplied by discoverer” until claimed or matched.

# 10. Delayed Pet Parent Discovery

Identity matching runs asynchronously after the encounter and again when new registered pets enter the database. A newly registered pet may retroactively match earlier discoveries.

```text
PET PARENT DISCOVERED
The dog you met at Pet Summit may be Cloud.
[Cloud photo] [Registered profile preview]
Match confidence: Likely
[Connect] [Ask Parent to Confirm] [Not This Pet]
```

| Privacy setting | System behavior |
| --- | --- |
| Automatic matching on + public pet identity | Discoverer can see pet name and parent display name, then connect |
| Matching on + confirmation required | Both users receive a confirmation request |
| Matching on + connections-only parent profile | Pet identity may match, but parent details remain hidden until accepted |
| Matching off | No discovery notification; only QR or direct invitation can connect |
| Private pet | Excluded from public matching and nearby discovery |

When confirmed, the discovery card merges into the canonical pet card while preserving the original photo, entered name, location, date and notes as the user’s encounter history.

# 11. Claim This Pet Flow

```text
UNCLAIMED PET CARD
Temporary name: Sunny
Met near De Jesus Oval
[Share “Do you know this pet?”]
[Suggest identity] [Claim as my pet] [Report welfare concern]
```

- A claimant must sign in, create or select a pet profile, and submit matching photos or another verification signal.
- High-confidence claims can be auto-approved when image similarity, name, place and historical photos strongly align; otherwise require moderation or community confirmation.
- The original discoverer receives a Pet Reuniter badge when a claim is confirmed.
- Social share cards promote PetDexter but must omit precise live location and private contact information.

# 12. Pet Card Detail Wireframe

```text
[PET PHOTO / CARD ART]
DUNCAN  [Connected ✓]
Pembroke Welsh Corgi
Pet Parent: Karla

YOUR CONNECTION
First met: Pet Summit Philippines 2027
Encounters: 4 | Places: 3 | Events: 2
Familiarity: Pet Pal — 65%

[Record Reunion] [Add Memory] [Share Card]
[Send Relationship Request from My Pet]

PERSONALITY • PET FAMILY • TIMELINE • PLACES
```

Card visual upgrades are earned through real relationship milestones, event achievements and approved cosmetics—not randomized worth assigned to the animal.

# 13. Familiarity Progression: User-to-Pet

| Level | Suggested name | Unlock condition | Unlocks |
| --- | --- | --- | --- |
| 0 | Discovered | First valid encounter | Basic card, place and date |
| 1 | New Acquaintance | Name recorded or identity matched | Name memory game and notes |
| 2 | Familiar Face | Second encounter on a different day | Traits and reunion badge |
| 3 | Pet Pal | Three encounters or confirmed parent connection | Pet family preview and shared memory |
| 4 | Adventure Friend | Three places or two events | Animated frame and deck bonus |
| 5 | Beloved Familiar | Five verified encounters across 30+ days | Special memory card and annual reunion recap |

Familiarity is personal to each user. It does not modify the pet’s canonical stats or create superiority rankings.

# 14. Pet-to-Pet Relationships

| Relationship | Meaning | Confirmation |
| --- | --- | --- |
| Pawsome Friend | Regular friend or companion | Both pet parents accept |
| Playdate Pal | Pets that regularly play together | Both accept |
| Adventure Buddy | Pets that visit places or events together | Both accept |
| Neighborhood Bestie | Frequently meet in a shared neighborhood | Both accept |
| Furboo | Playful affectionate crush or special companion | Both accept; lighthearted label |
| Furever Love | Deep or long-term bonded relationship | Both accept |
| Sibling at Heart | Family-like bond | Both accept |
| Housemate | Lives in the same household | Same owner or both accept |

```text
SEND A PET RELATIONSHIP
From: Duncan
To: Line
Choose relationship: [Pawsome Friend v]
Add a memory or photo (optional)
[Send request]
```

| Relationship level | Condition | Reward |
| --- | --- | --- |
| First Hello | One co-located encounter | Joint relationship card |
| Regular Pals | Three meetings on different days | Shared frame |
| Adventure Pair | Three different places or two events | Duo quest access |
| Long-Time Bond | Six months since confirmation + reunions | Anniversary card |
| Furever Bond | Parent-confirmed milestone | Premium-looking shared collectible, no competitive power |

# 15. Pet Family Calling Card

```text
KARLA'S PET FAMILY
[Duncan] [Yoyo] [Hope] [Line]

Share: (•) Current pet only  ( ) Selected pets  ( ) All public pets
[Show QR] [Send link] [Nearby exchange]
```

Connecting with a pet parent creates one parent connection and adds only the pets they elected to share. Other pets can be discovered later or made visible through permission changes.

# 16. PetDex Library Wireframe

```text
PETDEX
[My Pets] [Pets Met] [Community] [Adoption]

Collections
• Recent encounters
• Connected pet families
• Breeds
• Places
• Events
• Relationships
• My decks

[Search name, parent, breed, place]
```

Every PetDex entry links to one canonical pet where possible and one user-specific encounter record. A pet can appear in multiple filtered collections without creating duplicate pet records.

# 17. Decks: What Users Do With Cards

| Deck type | Example | Use |
| --- | --- | --- |
| Personal Collection | The Funniest Corgis I Met | Shareable social card carousel |
| Place Deck | BGC Street Cats | Explore and remember local pets |
| Event Deck | My Pet Summit 2027 PetDex | Automatic event recap |
| Relationship Deck | Duncan’s Pawsome Friends | Celebrate pet network |
| Adoption Deck | Pets I Want Friends to Meet | Advocacy sharing |
| Quest Deck | Seven Breeds at X Café | Proof and progress |
| Group Deck | Corgi Club Philippines | Collaborative collection |
| Memory Deck | Pets Whose Names I Learned | Used in recall games |

- Decks may be private, link-shareable, public or group-owned.
- A card can exist in multiple decks.
- Shared decks show only information permitted by each pet’s privacy settings.
- Event and quest decks can be auto-generated when a challenge ends.

# 18. PetDex Play

| Game | How cards are used | Solo/group/event |
| --- | --- | --- |
| Who’s That Pet? | Show photo; recall pet name | Solo and live event |
| Who’s the Pet Parent? | Match pet to connected parent | Solo; only consented profiles |
| Where Did We Meet? | Choose place or event | Solo |
| Pet Family Match | Group pets belonging to one parent | Solo/group |
| Breed Bingo | Complete a grid through real discoveries | Event/location |
| Trait Hunt | Find pets matching approved traits | Event/location |
| Pet Pair Match | Match confirmed Pawsome Friend pairs | Event |
| PetDex Relay | Teams complete discovery tasks | Event |
| Six Degrees of PetDexter | Find social connection paths through pets/parents | Group |
| Deck Showdown | Compare collection facts, never destroy cards | Group/event |

No game may transfer ownership, delete a card, expose hidden data or imply that one real pet is more valuable than another.

# 19. Quest System

| Quest field | Requirement |
| --- | --- |
| Scope | Global, event, place, organization, brand, group or personal |
| Time window | Start/end date, rolling duration or scheduled hours |
| Geofence | Optional verified radius or polygon |
| Eligibility | Age, location, event check-in, pet ownership or invite code |
| Objective | Unique pets, breeds, connections, places, relationships, adoption shares or games |
| Uniqueness rule | Per pet, per day, per place, per event or lifetime |
| Verification | AI match, QR, parent confirmation, staff validation or admin review |
| Reward | Badge, cosmetic, item, voucher, prize entry or community unlock |
| Inventory | Unlimited digital or capped physical redemption |
| Anti-fraud | Duplicate thresholds, suspicious velocity and audit queue |

# 20. Example Location Quest

```text
X CAFÉ PET SPOTTER
Discover 10 unique dogs at X Café within 7 days.
Progress: 6 / 10
Time left: 3d 8h
Reward: One selected drink
Rules: One count per unique pet. Captures must occur within the café geofence.
[View qualifying pets] [Invite a friend]
```

- The seven-day window begins when the user joins, unless the sponsor defines fixed dates.
- Ten photos of the same dog count as one unique dog and additional reunions.
- The business dashboard receives aggregate participation and redemption data.
- Reward redemption uses a single-use QR or staff code and an expiry timestamp.

# 21. Place Creation and Canonicalization

```text
ADD A PET-FRIENDLY PLACE
Name: [De Jesus Oval]
Map pin: [drag]
Category: [Park / Café / Mall / Other]
Pet-friendly evidence: [photo / note]
Amenities: [water] [outdoor] [pet menu] ...
[Submit community place]
```

Backend location resolution must prevent duplicate places and preserve event context.

| Resolution signal | Use |
| --- | --- |
| GPS distance | Find canonical places within a configurable radius |
| Name similarity | Match abbreviations, misspellings and aliases |
| Address and map provider ID | Anchor to an external canonical place when available |
| Parent-child place hierarchy | Venue, zone, store, café patio or event area |
| Date-specific event override | Attribute encounters to an active event while retaining the venue |
| Admin merge | Combine duplicates without losing encounters or user-submitted aliases |

Example storage: encounter.event_id = Pet Summit Philippines 2027; encounter.place_id = Ayala Malls Manila Bay; display label = “Pet Summit Philippines 2027 at Ayala Malls Manila Bay.”

# 22. Event Discovery and Event Mode

```text
EVENT: PET SUMMIT PHILIPPINES 2027
[Dates] [Venue] [Map] [Save]

[Check in] [Join Event PetDex]
Active quests: 12
Adoption organizations: 8
Participating brands: 45
Live leaderboards: 6
Event updates and announcements
```

- Admin defines event dates, daily hours, geofence, zones, sponsor quests and leaderboard categories.
- When a user enters the event geofence during active hours, the app suggests event check-in before a generic venue check-in.
- Event mode changes the Discover screen to show map zones, nearby quests, adoption collections and live rankings.
- After the event, the app generates a shareable Event PetDex recap.

# 23. Pet Summit Philippines Event Mechanics

| Mechanic | Example |
| --- | --- |
| Individual discovery quest | Meet 20 unique dogs and 10 unique cats |
| Breed quest | Find 15 distinct dog breeds |
| Connection quest | Connect with five pet parents |
| Relationship quest | Find or create three confirmed Pawsome Friend pairs |
| Adoption quest | Unlock pets from five verified AWOs |
| Brand trail | Complete six sponsor experiences |
| Secret Pawstar | Find a designated ambassador pet through clues |
| Zone quest | Visit and complete tasks in four event zones |
| Team quest | Teams collectively discover 500 unique pets |
| Community goal | All attendees unlock a commemorative card at 10,000 valid encounters |

# 24. Event Leaderboards and LED Output

| Leaderboard | Metric | Validation |
| --- | --- | --- |
| Pet Explorer | Unique pets discovered | Identity dedupe and quality threshold |
| Breed Master | Distinct validated breeds | Breed confidence or parent confirmation |
| Social Butterfly | Confirmed pet parent connections | Both-side accepted or QR exchange |
| Reunion Champion | Previously known pets met again | Prior encounter before event |
| Adoption Advocate | Unique adoption pets unlocked and shared | Verified AWO records |
| Quest Master | Completed event quests | Quest engine |
| Pawsome Connector | Confirmed pet-to-pet relationships initiated | Both parents accepted |
| Place Explorer | Zones and partner places completed | Geofence or QR |
| Team Champion | Team aggregate points | Validated member activity |

LED display should use anonymized display names, avatar or team names. Users can opt out of public display while still receiving private progress.

# 25. Adoption PetDex

```text
ADOPTION PETDEX
[Organizations] [Pets] [Saved] [Shared]

BRUNO — Looking for a home
Age 3 | Dog | Affectionate, Playful
Organization: Verified AWO
[Save] [Share] [Ask About Bruno]
```

- Only verified organizations may create adoption pet profiles.
- Users unlock current collections through organization QR, event booth QR, approved location activation or direct campaign link.
- When a pet is adopted, the card remains in historical decks but changes to “Adopted” and stops accepting inquiries.
- Rankings should reward meaningful actions such as unique pets shared, verified inquiries or organizations supported—not spam posting.
- Precise shelter or foster location is hidden unless the organization chooses to disclose it.

# 26. Branded Inventory and Rewarded Media

Branded items should be useful keys to discovery and quests rather than generic stat boosters.

| Item type | Use | Example brand mechanic |
| --- | --- | --- |
| Universal Discovery Snack | Capture one unknown pet | PetDexter starter item |
| Dog Snack | Capture or bonus a dog discovery | Dog food or treat sponsor |
| Cat Treat | Capture or bonus a cat discovery | Cat food sponsor |
| Friendship Treat | Bonus reunion or relationship progress | Treat brand |
| Breed Finder | Extra clue or breed quest boost | Nutrition or breed-focused brand |
| Adoption Token | Unlock sponsored AWO collection or trigger donation | CSR campaign |
| Place Pass | Join a location quest | Café, mall or venue |
| Event Mystery Item | Unlock clue, zone or secret pet | Event sponsor |
| Card Cosmetic | Frame, sticker or event stamp | Brand campaign reward |

| Acquisition route | Rule |
| --- | --- |
| Watch rewarded video | User chooses a specific item; strict daily and campaign caps |
| Scan product or booth QR | Free campaign item |
| Complete brand quest | Earn useful or cosmetic reward |
| Purchase at partner | Optional receipt/QR unlock; never required for core app use |
| Daily free grant | Small universal allowance to avoid hard blocking |
| Pet-to-pet profile exchange | Always free; no snack required |

# 27. Economy and Progression

Recommended currencies are simplified to avoid the current overlapping coins, treats, candy, feeding and ascension loop.

| Resource | Purpose | Sources | Sinks |
| --- | --- | --- | --- |
| Discovery Snacks | Capture unknown pets | Daily grant, ads, quests, brand QR | Unknown-pet capture |
| Paw Points | General progression score | Valid encounters, quests, connections, contributions | Cosmetics, deck themes, optional entries |
| Event Tokens | Temporary event currency | Event quests and sponsor activations | Event rewards only |
| Badges | Permanent achievements | Milestones and verified contributions | Display and access conditions; not spent |
| Relationship Hearts | Progress indicator, not spendable | Confirmed reunions and shared activities | Unlock relationship card stages |

Remove per-card candy, combat power and destructive ascension. Preserve XP only as a user-level indicator called Explorer Level or PetDex Level.

# 28. Achievement Framework

| Category | Examples |
| --- | --- |
| Discovery | First Pet Met, 25 Unique Pets, 10 Breeds |
| Memory | Remembered 10 Names, 10 Reunion Encounters |
| Connection | First Parent Connected, 25 Pet Families |
| Relationship | First Pawsome Friend, Five Adventure Pairs |
| Place | First Community Place, Five Verified Discoveries |
| Event | Pet Summit Explorer, Secret Pawstar Finder |
| Adoption | First AWO Collection, 50 Adoption Pets Shared |
| Community | Pet Reuniter, Place Verifier, Identity Helper |
| Group | Team Quest Champion, Club Collection Contributor |

# 29. Notifications

| Notification | Trigger | User control |
| --- | --- | --- |
| Pet parent discovered | A pending discovery matches a registered pet | Per matching/privacy settings |
| Someone may have found your pet | New high-confidence match to owned pet | On by default for opted-in pets |
| Relationship request | Another pet parent sends a request | On/off |
| Reunion nearby | Optional, only when both users opt into temporary event presence | Off by default |
| Quest progress | Near completion or expiring soon | Per quest |
| Event nearby | Saved categories and distance | Per discovery filters |
| Adoption update | Saved pet status changes | Per pet |
| Place verification | User-submitted place is approved or merged | On |
| Reward ready | Quest reward can be claimed | On |

# 30. Privacy, Safety and Ethical Rules

- No exact live location of a privately owned pet or person is shown by default.
- Pet matching must be opt-in at pet-profile level and may require parent confirmation.
- Parent names may be display names; private contact details are never added automatically.
- Minors’ profiles require guardian controls and cannot expose direct contact information.
- Unknown pet social cards use approximate place labels and delayed timestamps where safety requires.
- Community pet pages prohibit harmful feeding instructions, harassment, ownership claims without evidence and precise foster locations.
- Report flows: incorrect identity, privacy concern, stolen image, unsafe location, animal welfare concern, fraudulent quest activity.
- Facial recognition of people should not be used. Human faces should be blurred or cropped when possible.
- All adoption data must be controlled by verified organizations.
- Cards and relationships survive game losses; no destructive competition.

# 31. Duplicate Pet and Anti-Fraud Logic

The current technical foundation already computes visual embeddings, compares multiple viewing angles and recognizes revisits. The new system should reuse this for identity resolution and quest integrity rather than card battles.

| Signal | Contribution |
| --- | --- |
| Pet image embedding similarity | Primary same-pet candidate score |
| Multiple registered angles | Improves recognition across poses |
| Species and breed consistency | Rejects impossible matches |
| Name similarity | Supports but never solely confirms identity |
| Location and time | Contextual boost; never proof by itself |
| Owner confirmation | Strong verification |
| QR exchange | Definitive profile link |
| Capture velocity | Detects rapid repeated images or farming |
| Image provenance/spoof checks | Rejects screens, downloaded images and repeated files |
| Community consensus | Supports community pet identity with moderation |

| Quest counting rule | Recommended default |
| --- | --- |
| Unique pet | One canonical pet per user per quest |
| Revisit | May count only for reunion objectives |
| Same day duplicate | Never counts as another unique pet |
| Pending identity | Provisional progress; reward held until validated |
| Low-confidence capture | Visible in personal history but not ranked |
| Disputed match | Removed from ranking until resolved |

# 32. Admin Console

| Module | Capabilities |
| --- | --- |
| Pet moderation | Claims, merges, splits, identity disputes, privacy removals |
| Place management | Create, verify, merge, alias, geofence, hierarchy and business claims |
| Event management | Dates, venue, overrides, zones, news posts, quests and LED settings |
| Quest builder | Objectives, timeframes, geofences, validation, rewards and caps |
| Leaderboard control | Categories, fraud holds, manual disqualification and display opt-out |
| Organization verification | AWOs, brands, venues and communities |
| Adoption management | Organization feeds, expiration and adopted status |
| Campaign inventory | Branded items, ad caps, QR codes and redemption stock |
| Reports | Engagement, discoveries, connections, place visits, quest completion and redemption |
| Safety | Reports, blocked users, image removal and welfare escalation |

# 33. Organization Portals

| Portal | Key functions |
| --- | --- |
| Animal Welfare Organization | Manage available pets, QR collection, inquiries, adoption status and impact report |
| Brand | Create campaign items, sponsor quests, upload video, set caps and view aggregate analytics |
| Venue/Business | Claim place, publish pet rules, create location quests, manage rewards and see visits |
| Event Organizer | Create event mode, zones, quests, teams, announcements and LED leaderboards |
| Pet Community | Create group PetDex, member quests, meetups and collaborative collections |

# 34. Core Data Schema

| Table/entity | Essential fields |
| --- | --- |
| users | id, display_name, avatar, region, privacy, explorer_level, created_at |
| pet_profiles | id, owner_user_id, canonical_name, species, breed, traits, visibility, matching_opt_in, life_status |
| pet_images | id, pet_id, image_url, embedding, angle_type, verified, created_at |
| encounters | id, user_id, pet_id nullable, provisional_pet_id, photo, entered_name, occurred_at, place_id, event_id, status, match_confidence |
| provisional_pets | id, suggested_name, species, breed, traits, canonical_candidate_id, community_status |
| connections | id, user_a, user_b, source, status, created_at |
| pet_relationships | id, pet_a, pet_b, type, status, level, confirmed_by_a, confirmed_by_b |
| places | id, canonical_name, aliases, category, lat, lng, geofence, parent_place_id, verification_status |
| events | id, name, place_id, starts_at, ends_at, hours, geofence_override, status |
| quests | id, scope_type, scope_id, objective_json, validation_json, reward_json, starts_at, ends_at |
| quest_progress | user_id, quest_id, progress_json, status, verified_at |
| organizations | id, type, name, verification_status, admin_users |
| adoption_pets | pet_id, organization_id, adoption_status, inquiry_url, published_at |
| decks | id, owner_type, owner_id, title, visibility, deck_type |
| deck_cards | deck_id, pet_id, encounter_id nullable, sort_order |
| inventory | user_id, item_id, quantity, expiry |
| campaign_items | id, sponsor_org_id, item_type, rules, daily_cap, campaign_cap |
| reports | id, reporter_id, target_type, target_id, reason, status |

# 35. Key API / Service Actions

- captureEncounter(photo, userContext, placeContext, eventContext)
- matchPet(photoEmbedding, species, breedHint, nameHint, locationContext)
- createProvisionalPet(encounterData)
- mergeProvisionalWithCanonical(provisionalPetId, canonicalPetId)
- requestPetParentConnection(petId, discovererUserId)
- claimPet(provisionalPetId, ownerPetProfileId, evidence)
- recordReunion(userId, petId, placeId, eventId)
- createPetRelationship(petA, petB, relationshipType)
- confirmPetRelationship(relationshipId, ownerUserId)
- resolvePlace(inputName, gps, timestamp)
- createCommunityPlace(placeSubmission)
- checkInPet(petId, placeId, eventId)
- evaluateQuestProgress(userId, encounterOrAction)
- validateUniquePetForQuest(userId, questId, petCandidate)
- issueReward(userId, questId, redemptionRules)
- unlockAdoptionCollection(userId, organizationId, eventId)
- generateShareCard(cardOrDeckId, privacyContext)
- publishLeaderboardSnapshot(eventId, category)

# 36. Empty, Error and Edge States

| Situation | Required behavior |
| --- | --- |
| No network | Allow local draft encounter; sync and match later; ranked progress pending |
| No location permission | Manual place selection; location quests requiring geofence remain unavailable |
| No snack | Offer daily grant, chosen rewarded ad, QR exchange or save photo as uncounted draft |
| Pet parent declines match | Keep personal encounter as unconnected discovery; hide parent |
| Two users claim same pet | Freeze claim and route to evidence review |
| Pet has multiple legitimate caregivers | Allow co-parent roles and one canonical pet profile |
| Pet renamed | Canonical profile updates; user encounter timeline preserves original entered name |
| Duplicate canonical pets created | Admin merge keeps all encounters and relationships |
| Event overlaps another event at same venue | Admin priority and zone/time rules determine active context |
| Place closes | Archive place; preserve historical encounters |
| Adoption pet is adopted | Mark adopted; retain historical shares and remove active inquiry |
| Pet passes away | Owner may choose memorial status; disable new location prompts |
| False AI match | Easy “Not this pet” action; retrain/adjust matching record |
| User deletes account | Follow privacy policy; preserve anonymized aggregate counts only where permitted |

# 37. Recommended MVP Build

The full vision is broad. Build the new identity and encounter foundation first, then layer events, places and organizations.

| Phase | Build |
| --- | --- |
| MVP 1 — Identity and Encounters | Owned pet profiles, capture, name prompt, provisional pets, canonical matching, QR exchange, PetDex library, reunions, privacy, card merge |
| MVP 2 — Connections and Relationships | Pet parent discovery, pet family calling cards, Pawsome Friend/Furboo/Furever Love requests, timelines, decks |
| MVP 3 — Places and Quests | Canonical places, community submissions, check-ins, location quests, unique-pet validation, rewards |
| MVP 4 — Event Mode | Admin event override, Pet Summit quests, live leaderboards, group goals, LED output |
| MVP 5 — Adoption and Organizations | Verified AWO portal, adoption collection QR, social sharing, advocate achievements |
| MVP 6 — Brand Campaign Platform | Branded discovery items, rewarded video, quest sponsorship, venue rewards and analytics |

# 38. Current Code: Keep, Modify, Remove, Build

| Decision | Current capability | Action |
| --- | --- | --- |
| Keep | Camera capture and animal validation | Retain and refine |
| Keep | DINO-style identity embeddings and multi-angle recognition | Repurpose for canonical pet matching and anti-duplicate checks |
| Keep | PetDex card browser and card detail | Redesign information and card states |
| Keep | Map, check-in and leaderboards foundation | Expand into canonical places, events and verified ranking |
| Keep | Rewarded media plumbing | Connect to chosen branded items |
| Modify | Snack cans and refill | Simplify into discovery snacks with daily safety allowance |
| Modify | Rarity | Apply to encounter achievements, quests and cosmetics—not pet worth |
| Modify | XP and achievements | Shift to Explorer Level and contribution categories |
| Remove | Steal Wars and permanent card deletion | Replace with PetDex Play and collection-based challenges |
| Remove | Per-card combat Power and ascension candy | Replace with familiarity and relationship progress |
| Build | Provisional-to-canonical identity merge | Core new service |
| Build | Delayed pet parent discovery and claims | Core new social loop |
| Build | Pet-to-pet relationships | Core emotional mechanic |
| Build | Place canonicalization and event overrides | Required for location/event integrity |
| Build | Quest engine and admin console | Required for commercial and event use |
| Build | AWO adoption collections | New social impact pillar |

# 39. Build Acceptance Criteria

- A user can photograph a pet, enter a name, save the encounter and find it by name, place, event or date.
- The system can later link that encounter to a newly registered canonical pet without losing the original encounter data.
- A user can reject an incorrect match and the system will not repeatedly force it.
- A registered pet parent can choose whether their pet participates in discovery matching and what information is shown.
- Two users can exchange selected pet-family cards by QR for free.
- The same pet photographed repeatedly does not count as multiple unique pets in a quest.
- A revisit adds a reunion to the same card rather than minting a duplicate.
- Two pet parents can mutually confirm a Pawsome Friend, Furboo or Furever Love relationship.
- A user can add a community place, while the backend can merge it with an existing canonical place.
- An active event can override the display context of its parent venue for configured dates and zones.
- An administrator can create a quest with time, geofence, uniqueness, reward and leaderboard rules.
- An AWO can publish current adoption pets and users can unlock and share them without gaining edit control.
- No competitive action can destroy or transfer a real pet card.
- All share outputs obey pet and parent privacy settings.

# 40. App-Building Agent Instruction Block

```text
BUILD PETDEXTER AS A REAL-WORLD SOCIAL PET DISCOVERY GAME.

Do not implement pet combat, destructive card loss, ownership transfer of other people’s pets, or random rarity that implies pet value.

Use one canonical Pet record and many user-specific Encounter records. A captured unknown pet creates a provisional identity that may later merge into a registered canonical pet. Preserve every encounter during merges.

Core flows to implement first:
1. Create and manage owned pets with privacy and matching settings.
2. Capture an unknown pet, validate it, enter name/traits, save location/event context.
3. Match against canonical pets asynchronously and notify the user when a likely parent is found.
4. Connect by QR immediately or by confirmed backend match later.
5. Record reunions without duplicating pets.
6. Build PetDex views for My Pets, Pets Met, Community Pets and Adoption Pets.
7. Create mutual pet-to-pet relationships: Pawsome Friend, Furboo, Furever Love and related types.
8. Canonicalize places and support date-specific event overrides.
9. Validate unique pets for time-bound, location-bound and event-bound quests.
10. Provide admin tools for pets, places, events, quests, leaderboards, organizations and moderation.

The game loop is: Discover → Identify → Remember → Connect → Reconnect → Relate → Play → Share.
The emotional goal is to help users remember real pets and the people and places connected to them.
```

# 41. Final Product Positioning

PETDEXTER — Meet Pets. Remember Them. Collect Their Stories.

The real-world pet discovery game connecting every pet, person, place, event and story you meet.

The clearest human truth behind the product: You may forget a person’s name, but PetDexter helps you remember their pet.
