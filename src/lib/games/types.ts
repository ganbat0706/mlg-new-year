/**
 * Гурван тоглоомын (sort, stack, memo) нийтлэг үр дүнгийн хэлбэр.
 * Сервер browser-ийн оноонд итгэдэггүй тул үйлдлийн жагсаалтыг дахин
 * тоглуулаад энэ хэлбэрээр хариулна.
 */
export type GameResult = {
  score: number;
  accepted: number;
  rejected: number;
  /** Үйлдлийн доод зай зөрчигдсөн — боломжит скрипт. */
  suspicious: boolean;
};
