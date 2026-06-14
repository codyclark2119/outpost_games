# WPN Marketing Assets Organization

This folder contains official Wizards Play Network marketing materials organized by set and asset type.

## Folder Structure

All sets now follow a standardized, intuitive structure:

```
wpn-assets/
├── [set-name]/            # e.g., tmnt, lorwyn-eclipsed, avatar-last-airbender
│   ├── banners/           # Web banners and hero images
│   ├── posters/           # Printable event posters  
│   ├── product-images/    # Product photography and set assets
│   │   ├── set-symbols/       # Set symbols and expansion icons
│   │   ├── family-shots/      # Product family/group photos
│   │   ├── product-sheets/    # Individual product images
│   │   └── commander-decks/   # Commander deck artwork (if applicable)
│   └── social-media/      # Social media graphics
│       ├── key-art/           # Hero/key art images
│       └── fnm/               # Friday Night Magic graphics
└── general/
    ├── event-templates/   # Event graphics
    │   ├── fnm/               # Friday Night Magic titles/graphics
    │   └── prerelease/        # Prerelease event graphics
    ├── logos/             # MTG branding
    │   └── mtg/               # Magic: The Gathering logos
    └── store-branding/    # WPN badges and store materials
```

## How to Use

### Adding New Set Folders
When a new MTG set is released:
1. Create a new folder with the set name (lowercase, hyphenated)
2. Create the standard subfolders:
   ```bash
   mkdir -p [set-name]/banners
   mkdir -p [set-name]/posters
   mkdir -p [set-name]/product-images/set-symbols
   mkdir -p [set-name]/product-images/family-shots
   mkdir -p [set-name]/product-images/product-sheets
   mkdir -p [set-name]/social-media/key-art
   mkdir -p [set-name]/social-media/fnm
   ```
3. Download materials from WPN portal and organize into the appropriate folders

### Accessing Assets in Your Website

All files in the `public` folder are accessible directly via URL:

```vue
<!-- Example: Using set symbols -->
<img src="/wpn-assets/avatar-last-airbender/product-images/set-symbols/TLAMythic_3in.png" alt="Avatar Set Symbol" />

<!-- Example: Social media key art -->
<img src="/wpn-assets/final-fantasy/social-media/key-art/FIN_sma_key_1920x1080_en.jpg" alt="Final Fantasy Key Art" />

<!-- Example: General MTG logos -->
<img src="/wpn-assets/general/logos/mtg/MTG_Primary_LL_1c_White_LG_V12.png" alt="Magic: The Gathering" />
```

### File Naming Conventions

Use clear, descriptive names:
- `hero-banner.jpg` - Main homepage banner
- `facebook-event-cover.jpg` - Facebook event image (1200x630)
- `instagram-post.jpg` - Instagram square (1080x1080)
- `twitter-header.jpg` - Twitter header (1500x500)
- `prerelease-poster.pdf` - Print-ready poster
- `booster-pack.png` - Product image with transparency

### Recommended Asset Sizes

#### Web Banners
- **Hero Banner**: 1920x600px (desktop), 800x600px (mobile)
- **Section Banner**: 1200x400px
- **Small Feature**: 600x300px

#### Social Media
- **Facebook Post**: 1200x630px
- **Instagram Post**: 1080x1080px (square) or 1080x1350px (portrait)
- **Twitter Post**: 1200x675px
- **Facebook Cover**: 820x312px

#### Product Images
- **High-res**: 2000x2000px (PNG with transparency)
- **Web-optimized**: 800x800px (JPG or PNG)
- **Thumbnail**: 300x300px

## Quick Reference: Active Sets

| Set | Asset Path | Status |
|-----|------------|--------|
| Avatar: The Last Airbender | `/wpn-assets/avatar-last-airbender/` | Active |
| Duskmourn: House of Horror | `/wpn-assets/duskmourn-house-horror/` | Active |
| Edge of Eternities | `/wpn-assets/edge-eternities/` | Active |
| Final Fantasy | `/wpn-assets/final-fantasy/` | Active |
| Lorwyn Eclipsed | `/wpn-assets/lorwyn-eclipsed/` | Active |
| Spider-Man | `/wpn-assets/spiderman/` | Active |
| Tarkir: Dragonstorm | `/wpn-assets/tarkir-dragonstorm/` | Active |
| TMNT | `/wpn-assets/tmnt/` | Active |
| General/Evergreen | `/wpn-assets/general/` | Always Active |

## Best Practices

### File Management
1. **Keep originals**: Save high-res versions before optimizing
2. **Optimize for web**: Compress images to reduce file size
3. **Use WebP when possible**: Better compression than JPG
4. **Create responsive versions**: Multiple sizes for different devices

### Organization Tips
1. **Date folders**: For time-sensitive materials, add date prefix (e.g., `2026-02-prerelease/`)
2. **Archive old sets**: Move outdated materials to an `_archive/` folder
3. **Maintain consistency**: Use the same structure for each new set
4. **Document usage**: Note which assets are used where in comments

### Legal Compliance
- ✅ All assets must be downloaded from official WPN portal
- ✅ Use assets as-is; don't modify logos or trademarked elements
- ✅ Keep copyright notices intact
- ✅ Reference WPN_ASSET_ACCESS_GUIDE.md for detailed policies

## Quick Reference: Active Sets

| Set | Asset Path | Status |
|-----|------------|--------|
| Avatar: The Last Airbender | `/wpn-assets/avatar-last-airbender/` | Active |
| Duskmourn: House of Horror | `/wpn-assets/duskmourn-house-horror/` | Active |
| Edge of Eternities | `/wpn-assets/edge-eternities/` | Active |
| Final Fantasy | `/wpn-assets/final-fantasy/` | Active |
| Lorwyn Eclipsed | `/wpn-assets/lorwyn-eclipsed/` | Active |
| Spider-Man | `/wpn-assets/spiderman/` | Active |
| Tarkir: Dragonstorm | `/wpn-assets/tarkir-dragonstorm/` | Active |
| TMNT | `/wpn-assets/tmnt/` | Active |
| General/Evergreen | `/wpn-assets/general/` | Always Active |

---

## Best Practices

### Monthly
- Download new materials for upcoming sets
- Update homepage banners for current set
- Archive materials from rotated sets

### Per Set Release
- Download complete marketing kit 2-3 weeks before release
- Update website assets 1 week before Prerelease
- Add product images on release day
- Update social media graphics weekly during set season

### Quarterly
- Review and clean up unused files
- Optimize image sizes for better performance
- Archive old set materials
- Update general/event-templates if WPN provides new versions

## Image Optimization Tools

Before adding images, optimize them:
- **TinyPNG**: https://tinypng.com/ (PNG/JPG compression)
- **Squoosh**: https://squoosh.app/ (Google's image optimizer)
- **ImageOptim** (Mac): https://imageoptim.com/

## Support

For questions about:
- **Asset usage**: See `/WPN_ASSET_ACCESS_GUIDE.md`
- **Downloading materials**: https://wpn.wizards.com/en/marketing-materials
- **WPN Support**: https://support.wizards.com/

---

**Last Updated**: March 15, 2026  
**Maintained by**: The Outpost Games  
**Major Update**: Reorganized all assets into standardized folder structure
