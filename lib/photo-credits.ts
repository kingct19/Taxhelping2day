export type PhotoCredit = {
  label: string;
  creator: string;
  license: string;
  licenseUrl: string;
  sourceLabel: string;
  sourceUrl: string;
};

const cc0 = "https://creativecommons.org/publicdomain/zero/1.0/";
const by2 = "https://creativecommons.org/licenses/by/2.0/";
const by3 = "https://creativecommons.org/licenses/by/3.0/";
const by4 = "https://creativecommons.org/licenses/by/4.0/";
const bySa2 = "https://creativecommons.org/licenses/by-sa/2.0/";
const bySa3 = "https://creativecommons.org/licenses/by-sa/3.0/";
const bySa4 = "https://creativecommons.org/licenses/by-sa/4.0/";
const pd = "https://creativecommons.org/publicdomain/mark/1.0/";

export const photoCredits: PhotoCredit[] = [
  {
    label: "How we work",
    creator: "Negative Space",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "StockSnap",
    sourceUrl: "https://stocksnap.io/photo/office-work-QK8UF7C718",
  },
  {
    label: "About the firm",
    creator: "Renelibrary",
    license: "CC BY-SA 4.0",
    licenseUrl: bySa4,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Downtown_Hamilton_Texas_Wiki3.jpg",
  },
  {
    label: "Tax preparation",
    creator: "Artsy Crafty",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "StockSnap",
    sourceUrl: "https://stocksnap.io/photo/finance-flatlay-LPD3QR7VQG",
  },
  {
    label: "Bookkeeping",
    creator: "Oliver Klein",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "StockSnap",
    sourceUrl: "https://stocksnap.io/photo/chair-notebook-7ZPSYLVQNC",
  },
  {
    label: "Tax planning",
    creator: "Marc Chouinard",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "StockSnap",
    sourceUrl: "https://stocksnap.io/photo/business-working-PHE63L27S6",
  },
  {
    label: "Financial management",
    creator: "Startup Stock Photos",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "StockSnap",
    sourceUrl: "https://stocksnap.io/photo/team-meeting-69TMH4ITIE",
  },
  {
    label: "Individuals and families",
    creator: "Direct Media",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "StockSnap",
    sourceUrl: "https://stocksnap.io/photo/family-breakfast-ERWVLD9KER",
  },
  {
    label: "Businesses",
    creator: "Rob Bye",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "StockSnap",
    sourceUrl: "https://stocksnap.io/photo/business-establishments-3QX7WQCK52",
  },
  {
    label: "Non-profit organizations",
    creator: "Andre Carrotflower",
    license: "CC BY-SA 4.0",
    licenseUrl: bySa4,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:St._Elia_Albanian_Orthodox_Church_-_fmr_Brooklyn_Heights_Methodist_Church_-_Jamestown,_New_York_-_20210418.jpg",
  },
  {
    label: "Texas",
    creator: "Renelibrary",
    license: "CC BY-SA 4.0",
    licenseUrl: bySa4,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Chelsey_Building_Hamilton_Wiki_1.jpg",
  },
  {
    label: "Florida",
    creator: "4net",
    license: "CC BY 3.0",
    licenseUrl: by3,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Siesta_Key_Beach._Sarasota_-_panoramio_-_4net_(3).jpg",
  },
  {
    label: "Tennessee",
    creator: "Lee Ann Ratledge",
    license: "CC BY 4.0",
    licenseUrl: by4,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Cades_Cove_-_Great_Smoky_Mountains_National_Park,_Tennessee_-_June_21,_2015.jpg",
  },
  {
    label: "Oklahoma",
    creator: "DBinfo",
    license: "Public domain",
    licenseUrl: pd,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tallgrass_Prairie_Preserve.jpg",
  },
  {
    label: "Arkansas",
    creator: "Brandonrush",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Buffalo_National_River_at_Carver_Landing_001.jpg",
  },
  {
    label: "Alabama",
    creator: "Tony Webster",
    license: "CC BY-SA 2.0",
    licenseUrl: bySa2,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Birmingham_Skyline,_Alabama_(27864996195).jpg",
  },
  {
    label: "Kansas",
    creator: "Travel Photographer",
    license: "CC0",
    licenseUrl: cc0,
    sourceLabel: "StockSnap",
    sourceUrl: "https://stocksnap.io/photo/wheat-background-WUDNIZG6H4",
  },
  {
    label: "Arizona",
    creator: "dconvertini",
    license: "CC BY-SA 2.0",
    licenseUrl: bySa2,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Saguaro_National_Park_East,_Arizona,_USA_2024_2.jpg",
  },
  {
    label: "Virginia",
    creator: "Famartin",
    license: "CC BY-SA 4.0",
    licenseUrl: bySa4,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:2016-10-25_13_49_22_View_north-northwest_from_the_Shenandoah_Valley_Overlook_along_Shenandoah_National_Park%27s_Skyline_Drive_in_Warren_County,_Virginia.jpg",
  },
  {
    label: "New York",
    creator: "Fran Trudeau",
    license: "CC BY 2.0",
    licenseUrl: by2,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Bear_Mountain_Bridge,_Hudson_River.jpg",
  },
  {
    label: "California",
    creator: "Diliff",
    license: "CC BY-SA 3.0",
    licenseUrl: bySa3,
    sourceLabel: "Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Central_Californian_Coastline,_Big_Sur_-_May_2013.jpg",
  },
];
