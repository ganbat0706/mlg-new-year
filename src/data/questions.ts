export type QuestionSeed = {
  text: string;
  options: string[];
  correctIndex: number;
};

/** Компанийн баг бөглөх ёстой асуултыг энэ тэмдгээр эхлүүлнэ. */
export const PLACEHOLDER_MARK = '[БӨГЛӨХ]';

export const QUESTION_BANK: ReadonlyArray<QuestionSeed> = [
  {
    text: `${PLACEHOLDER_MARK} Monlogistics Group хэдэн онд байгуулагдсан бэ?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  },
  {
    text: `${PLACEHOLDER_MARK} Monlogistics Group хэдэн салбартай вэ?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  },
  {
    text: `${PLACEHOLDER_MARK} Компанийн уриа үг аль нь вэ?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  },
  {
    text: '"TEU" гэдэг нь юуны товчлол вэ?',
    options: [
      'Total Export Unit',
      'Twenty-foot Equivalent Unit',
      'Transit Entry Unit',
      'Terminal Exchange Unit',
    ],
    correctIndex: 1,
  },
  {
    text: 'FOB нөхцөлд худалдагчийн хариуцлага хэзээ дуусах вэ?',
    options: [
      'Агуулахаас ачаа гарах үед',
      'Ачааг хөлөг онгоцон дээр ачсан үед',
      'Худалдан авагч ачааг хүлээн авах үед',
      'Гаалийн бүрдүүлэлт дуусах үед',
    ],
    correctIndex: 1,
  },
  {
    text: 'CIF нөхцөлд ачааны даатгалын зардлыг хэн хариуцах вэ?',
    options: ['Худалдагч', 'Худалдан авагч', 'Тээвэрлэгч', 'Гаалийн байгууллага'],
    correctIndex: 0,
  },
  {
    text: 'Далайн тээвэрт ашиглагддаг ачааны үндсэн баримтыг юу гэдэг вэ?',
    options: ['Air Waybill', 'Bill of Lading (B/L)', 'Packing List', 'Proforma Invoice'],
    correctIndex: 1,
  },
  {
    text: 'Агаарын тээвэрт ачааны баримтыг юу гэж нэрлэдэг вэ?',
    options: ['Air Waybill (AWB)', 'Bill of Lading', 'CMR', 'Rail Waybill'],
    correctIndex: 0,
  },
  {
    text: '40 футын стандарт контейнерийн дотоод эзлэхүүн ойролцоогоор хэд вэ?',
    options: ['33 м³', '47 м³', '67 м³', '95 м³'],
    correctIndex: 2,
  },
  {
    text: 'HS код гэж юу вэ?',
    options: [
      'Тээврийн хэрэгслийн улсын дугаар',
      'Барааг гаалийн зориулалтаар ангилах олон улсын код',
      'Агуулахын тавиурын код',
      'Даатгалын гэрээний дугаар',
    ],
    correctIndex: 1,
  },
  {
    text: 'Замын-Үүд боомтын эсрэг талд БНХАУ-ын аль боомт байрладаг вэ?',
    options: ['Эрээн', 'Тяньжин', 'Маньжуур', 'Хөх хот'],
    correctIndex: 0,
  },
  {
    text: 'ОХУ-тай хиллэдэг Монголын гол төмөр замын боомт аль нь вэ?',
    options: ['Сүхбаатар', 'Алтанбулаг', 'Чойбалсан', 'Бичигт'],
    correctIndex: 0,
  },
  {
    text: '"Транзит тээвэр" гэж юуг хэлэх вэ?',
    options: [
      'Зөвхөн улс дотор хийгдэх тээвэр',
      'Нэг улсаас нөгөө рүү гуравдагч улсын нутгаар дамжин өнгөрөх тээвэр',
      'Агуулахаас агуулах руу зөөх',
      'Буцаалтын тээвэр',
    ],
    correctIndex: 1,
  },
  {
    text: 'Дэлхий дээр Шинэ жилийг хамгийн түрүүнд угтдаг улс аль нь вэ?',
    options: ['Шинэ Зеланд', 'Кирибати', 'Япон', 'Австрали'],
    correctIndex: 1,
  },
  {
    text: '2026 он зурхайгаар ямар жил вэ?',
    options: ['Бар жил', 'Туулай жил', 'Морин жил', 'Хонин жил'],
    correctIndex: 2,
  },
];
