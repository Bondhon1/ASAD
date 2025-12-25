export type BangladeshDivision = {
  name: string;
  districts: {
    name: string;
    upazilas: string[];
  }[];
};

// Light-weight Bangladesh administrative data for dropdowns.
// Includes common upazilas; users can still type their own if missing.
export const bangladeshGeo: BangladeshDivision[] = [
  {
    name: "Dhaka",
    districts: [
      { name: "Dhaka", upazilas: ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"] },
      { name: "Faridpur", upazilas: ["Faridpur Sadar", "Alfadanga", "Bhanga", "Boalmari", "Nagarkanda"] },
      { name: "Gazipur", upazilas: ["Gazipur Sadar", "Kaliakair", "Kapasia", "Kaliganj", "Sreepur"] },
      { name: "Gopalganj", upazilas: ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"] },
      { name: "Kishoreganj", upazilas: ["Kishoreganj Sadar", "Bajitpur", "Bhairab", "Hossainpur", "Katiadi"] },
      { name: "Madaripur", upazilas: ["Madaripur Sadar", "Rajoir", "Shibchar", "Kalkini"] },
      { name: "Manikganj", upazilas: ["Manikganj Sadar", "Daulatpur", "Ghior", "Harirampur", "Saturia"] },
      { name: "Munshiganj", upazilas: ["Munshiganj Sadar", "Gazaria", "Lohajang", "Sirajdikhan", "Sreenagar", "Tongibari"] },
      { name: "Narayanganj", upazilas: ["Narayanganj Sadar", "Araihazar", "Bandar", "Rupganj", "Sonargaon"] },
      { name: "Narsingdi", upazilas: ["Narsingdi Sadar", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"] },
      { name: "Rajbari", upazilas: ["Rajbari Sadar", "Baliakandi", "Goalanda", "Pangsha", "Kalukhali"] },
      { name: "Shariatpur", upazilas: ["Shariatpur Sadar", "Bhedarganj", "Damudya", "Gosairhat", "Naria", "Zanjira"] },
      { name: "Tangail", upazilas: ["Tangail Sadar", "Basail", "Bhuapur", "Delduar", "Ghatail", "Madhupur", "Mirzapur", "Sakhipur"] },
      { name: "Mymensingh", upazilas: ["Mymensingh Sadar", "Gaffargaon", "Gouripur", "Ishwarganj", "Trishal"] },
      { name: "Jamalpur", upazilas: ["Jamalpur Sadar", "Bakshiganj", "Dewanganj", "Islampur", "Sarishabari"] },
      { name: "Sherpur", upazilas: ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"] },
      { name: "Netrokona", upazilas: ["Netrokona Sadar", "Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kendua", "Madan"] },
    ],
  },
  {
    name: "Chattogram",
    districts: [
      { name: "Chattogram", upazilas: ["Chattogram Sadar", "Anwara", "Boalkhali", "Hathazari", "Mirsharai", "Patiya", "Raozan", "Sitakunda"] },
      { name: "Cox's Bazar", upazilas: ["Cox's Bazar Sadar", "Chakaria", "Kutubdia", "Maheshkhali", "Ramu", "Teknaf", "Ukhia"] },
      { name: "Cumilla", upazilas: ["Cumilla Adarsha Sadar", "Cumilla Sadar Dakshin", "Barura", "Brahmanpara", "Chandina", "Debidwar", "Daudkandi", "Homna", "Laksam", "Muradnagar"] },
      { name: "Feni", upazilas: ["Feni Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Sonagazi"] },
      { name: "Brahmanbaria", upazilas: ["Brahmanbaria Sadar", "Akhaura", "Ashuganj", "Bancharampur", "Kasba", "Nabinagar", "Sarail"] },
      { name: "Chandpur", upazilas: ["Chandpur Sadar", "Faridganj", "Haimchar", "Hajiganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"] },
      { name: "Lakshmipur", upazilas: ["Lakshmipur Sadar", "Kamalnagar", "Ramganj", "Ramgati", "Raipur"] },
      { name: "Noakhali", upazilas: ["Noakhali Sadar", "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar"] },
      { name: "Bandarban", upazilas: ["Bandarban Sadar", "Alikadam", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"] },
      { name: "Khagrachhari", upazilas: ["Khagrachhari Sadar", "Dighinala", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh"] },
      { name: "Rangamati", upazilas: ["Rangamati Sadar", "Baghaichhari", "Barkal", "Jurai Chhari", "Kaptai", "Kawkhali", "Langadu", "Naniarchar", "Rajasthali"] },
    ],
  },
  {
    name: "Rajshahi",
    districts: [
      { name: "Rajshahi", upazilas: ["Rajshahi Sadar", "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"] },
      { name: "Pabna", upazilas: ["Pabna Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"] },
      { name: "Natore", upazilas: ["Natore Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra"] },
      { name: "Sirajganj", upazilas: ["Sirajganj Sadar", "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Tarash", "Ullapara"] },
      { name: "Naogaon", upazilas: ["Naogaon Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mohadevpur", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"] },
      { name: "Joypurhat", upazilas: ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"] },
      { name: "Bogura", upazilas: ["Bogura Sadar", "Adamdighi", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Sherpur", "Shibganj", "Sonatala"] },
      { name: "Chapainawabganj", upazilas: ["Chapainawabganj Sadar", "Bholahat", "Gomastapur", "Nachole", "Shibganj"] },
    ],
  },
  {
    name: "Khulna",
    districts: [
      { name: "Khulna", upazilas: ["Khulna Sadar", "Batiaghata", "Dacope", "Dumuria", "Koyra", "Paikgachha", "Phultala", "Rupsa", "Terokhada"] },
      { name: "Bagerhat", upazilas: ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"] },
      { name: "Satkhira", upazilas: ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"] },
      { name: "Jessore", upazilas: ["Jessore Sadar", "Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"] },
      { name: "Narail", upazilas: ["Narail Sadar", "Kalia", "Lohagara"] },
      { name: "Jhenaidah", upazilas: ["Jhenaidah Sadar", "Harinakunda", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"] },
      { name: "Magura", upazilas: ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"] },
      { name: "Kushtia", upazilas: ["Kushtia Sadar", "Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Mirpur"] },
      { name: "Chuadanga", upazilas: ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"] },
      { name: "Meherpur", upazilas: ["Meherpur Sadar", "Gangni", "Mujibnagar"] },
    ],
  },
  {
    name: "Barishal",
    districts: [
      { name: "Barishal", upazilas: ["Barishal Sadar", "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Gournadi", "Hizla", "Mehendiganj", "Muladi", "Uzirpur"] },
      { name: "Bhola", upazilas: ["Bhola Sadar", "Borhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"] },
      { name: "Jhalokati", upazilas: ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"] },
      { name: "Patuakhali", upazilas: ["Patuakhali Sadar", "Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj", "Rangabali"] },
      { name: "Pirojpur", upazilas: ["Pirojpur Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Indurkani"] },
      { name: "Barguna", upazilas: ["Barguna Sadar", "Amtali", "Bamna", "Betagi", "Patharghata", "Taltali"] },
    ],
  },
  {
    name: "Sylhet",
    districts: [
      { name: "Sylhet", upazilas: ["Sylhet Sadar", "Balaganj", "Bishwanath", "Companiganj", "Dakshin Surma", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Zakiganj"] },
      { name: "Moulvibazar", upazilas: ["Moulvibazar Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"] },
      { name: "Habiganj", upazilas: ["Habiganj Sadar", "Ajmiriganj", "Bahubal", "Baniyachong", "Chunarughat", "Lakhai", "Madhabpur", "Nabiganj", "Sayestaganj"] },
      { name: "Sunamganj", upazilas: ["Sunamganj Sadar", "Bishwamvarpur", "Chhatak", "Derai", "Dharampasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sullah", "Tahirpur"] },
    ],
  },
  {
    name: "Rangpur",
    districts: [
      { name: "Rangpur", upazilas: ["Rangpur Sadar", "Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"] },
      { name: "Dinajpur", upazilas: ["Dinajpur Sadar", "Birampur", "Birganj", "Birol", "Bochaganj", "Chirirbandar", "Fulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"] },
      { name: "Kurigram", upazilas: ["Kurigram Sadar", "Bhurungamari", "Char Rajibpur", "Chilmari", "Nageshwari", "Phulbari", "Rajarhat", "Raomari", "Ulipur"] },
      { name: "Gaibandha", upazilas: ["Gaibandha Sadar", "Fulchhari", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"] },
      { name: "Nilphamari", upazilas: ["Nilphamari Sadar", "Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Saidpur"] },
      { name: "Lalmonirhat", upazilas: ["Lalmonirhat Sadar", "Aditmari", "Hatibandha", "Kaliganj", "Patgram"] },
      { name: "Panchagarh", upazilas: ["Panchagarh Sadar", "Atwari", "Boda", "Debiganj", "Tetulia"] },
      { name: "Thakurgaon", upazilas: ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Pirganj", "Ranisankail"] },
    ],
  },
  {
    name: "Mymensingh",
    districts: [
      { name: "Mymensingh", upazilas: ["Mymensingh Sadar", "Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gouripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Nandail", "Phulpur", "Trishal"] },
      { name: "Netrokona", upazilas: ["Netrokona Sadar", "Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Purbadhala"] },
      { name: "Jamalpur", upazilas: ["Jamalpur Sadar", "Bakshiganj", "Dewanganj", "Islampur", "Madarganj", "Melandaha", "Sarishabari"] },
      { name: "Sherpur", upazilas: ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"] },
    ],
  },
];

export const divisions = bangladeshGeo.map((d) => d.name);

export const getDistricts = (division?: string) => {
  const div = bangladeshGeo.find((d) => d.name === division);
  return div ? div.districts.map((d) => d.name) : [];
};

export const getUpazilas = (division?: string, district?: string) => {
  const div = bangladeshGeo.find((d) => d.name === division);
  const dist = div?.districts.find((d) => d.name === district);
  return dist ? dist.upazilas : [];
};
