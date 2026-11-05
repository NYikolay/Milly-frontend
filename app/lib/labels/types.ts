export interface ColorResponse {
  id: number;
  slug: string;
  name: string;
  hex: string;
}

export interface LabelResponse {
  id: number;
  name: string;
  color: ColorResponse;
  created_at: string;
  updated_at: string;
}
