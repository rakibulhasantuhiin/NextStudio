import type { BanglaFontId, HighlightColorId } from '../utils/richText';

export type CvTemplateId =
  | 'classic-plain'
  | 'modern-sidebar'
  | 'abroad-visa'
  | 'marriage-biodata'
  | 'colored-bar'
  | 'minimal-line'
  | 'colored-sidebar-1p'
  | 'executive-one-col'
  | 'minimal-ats'
  | 'colored-sidebar-2p'
  | 'bangla-biodata'
  | 'navy-tech-sidebar'
  | 'classic-with-photo'
  | 'fresher-1p'
  | 'colored-header-band'
  | 'abroad-gulf'
  | 'govt-ngo-formal';

export type CvCategory = 'all' | 'job' | 'abroad' | 'marriage' | 'fresher';

export type CvFontStyle = 'serif' | 'sans' | 'classic';

export type CvDensity = 'compact' | 'normal' | 'spacious';

export interface CvExperienceItem {
  id: string;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CvEducationItem {
  id: string;
  degree: string;
  institution: string;
  boardOrGroup: string;
  year: string;
  result: string;
}

export interface CvTrainingItem {
  id: string;
  title: string;
  institute: string;
  year: string;
}

export interface CvReferenceItem {
  id: string;
  name: string;
  designation: string;
  organization: string;
  phone: string;
}

export interface CvData {
  templateId: CvTemplateId;
  cvLang: 'en' | 'bn';
  accentColor: string;
  fontStyle: CvFontStyle;
  banglaFont?: BanglaFontId;
  fontSizePx?: number;
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textHighlight?: HighlightColorId;
  density: CvDensity;
  photo: string;
  photoShape: 'rect' | 'rounded' | 'circle';
  signatureImage: string;
  signatureText: string;

  // Core header & summary
  fullName: string;
  jobTitle: string;
  phone: string;
  email: string;
  address: string;
  permanentAddress: string;
  careerObjective: string;

  // Repeatable lists
  experiences: CvExperienceItem[];
  educations: CvEducationItem[];
  skills: string[];
  languages: string[];
  trainings: CvTrainingItem[];
  references: CvReferenceItem[];

  // Personal details
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  age: string;
  nationalId: string;
  religion: string;
  maritalStatus: string;
  nationality: string;
  bloodGroup: string;
  gender: string;
  height: string;
  weight: string;
  complexion: string;

  // Abroad / Gulf passport details
  passportNo: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  passportIssuePlace: string;
  bangladeshContact: string;

  // Marriage biodata details
  occupation: string;
  fatherOccupation: string;
  motherOccupation: string;
  brothers: string;
  sisters: string;
  partnerExpectation: string;
  guardianContact: string;

  // Declaration
  declarationText: string;

  // Optional sections visibility
  showLanguages: boolean;
  showTrainings: boolean;
  showReferences: boolean;
  showPassportInfo: boolean;
  showFamilyInfo: boolean;
}

export interface CvTemplateMeta {
  id: CvTemplateId;
  category: Exclude<CvCategory, 'all'>;
  nameBn: string;
  nameEn: string;
  metaBn: string;
  metaEn: string;
  descBn: string;
  descEn: string;
  defaultAccent: string;
  hasPhoto: boolean;
}

export type CvFieldTarget =
  | { type: 'basic'; field: 'fullName' | 'jobTitle' | 'phone' | 'email' | 'address' | 'permanentAddress' | 'careerObjective' | 'declarationText' }
  | { type: 'personal'; field: 'fatherName' | 'motherName' | 'dateOfBirth' | 'age' | 'nationalId' | 'religion' | 'maritalStatus' | 'nationality' | 'bloodGroup' | 'gender' | 'height' | 'weight' | 'complexion' }
  | { type: 'passport'; field: 'passportNo' | 'passportIssueDate' | 'passportExpiryDate' | 'passportIssuePlace' | 'bangladeshContact' }
  | { type: 'family'; field: 'occupation' | 'fatherOccupation' | 'motherOccupation' | 'brothers' | 'sisters' | 'partnerExpectation' | 'guardianContact' }
  | { type: 'experience'; index: number; subField?: 'role' | 'company' | 'startDate' | 'endDate' | 'description' }
  | { type: 'education'; index: number; subField?: 'degree' | 'institution' | 'boardOrGroup' | 'year' | 'result' }
  | { type: 'training'; index: number }
  | { type: 'reference'; index: number }
  | { type: 'skills' }
  | { type: 'languages' }
  | { type: 'photo' }
  | { type: 'signature' };
