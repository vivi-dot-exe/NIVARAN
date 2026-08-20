import type { Authority, DepartmentType } from '../types/grievance';

export const AUTHORITIES_LIST: Authority[] = [
  {
    id: 'AUTH-MCGM',
    name: 'Municipal Corporation of Greater Mumbai',
    type: 'Municipal Urban Local Body',
    departments: ['Roads & Infra', 'Sanitation & Waste']
  },
  {
    id: 'AUTH-MWSB',
    name: 'Maharashtra Water Supply & Sewerage Board',
    type: 'State Water & Sanitation Utility',
    departments: ['Water Supply']
  },
  {
    id: 'AUTH-BEST',
    name: 'BEST Electricity & Power Supply Board',
    type: 'Power & Distribution Utility',
    departments: ['Electricity']
  },
  {
    id: 'AUTH-PHD',
    name: 'Public Health Department & NIC Healthcare Cell',
    type: 'State Health & Epidemic Control Authority',
    departments: ['Public Health & Healthcare']
  },
  {
    id: 'AUTH-FCSD',
    name: 'Food & Civil Supplies Department',
    type: 'Public Distribution System Board',
    departments: ['Public Distribution']
  }
];

export const getAuthorityForDepartment = (dept: DepartmentType): { authority: string; deptName: string } => {
  switch (dept) {
    case 'Water Supply':
      return {
        authority: 'Maharashtra Water Supply & Sewerage Board',
        deptName: 'Water Maintenance Division'
      };
    case 'Roads & Infra':
      return {
        authority: 'Municipal Corporation of Greater Mumbai',
        deptName: 'Municipal Roads & Infrastructure Department'
      };
    case 'Sanitation & Waste':
      return {
        authority: 'Municipal Corporation of Greater Mumbai',
        deptName: 'Solid Waste Management Division'
      };
    case 'Electricity':
      return {
        authority: 'BEST Electricity & Power Supply Board',
        deptName: 'High Voltage Distribution Operations'
      };
    case 'Public Health & Healthcare':
      return {
        authority: 'Public Health Department & NIC Healthcare Cell',
        deptName: 'Epidemic & Civic Sanitation Division'
      };
    case 'Public Distribution':
      return {
        authority: 'Food & Civil Supplies Department',
        deptName: 'Social Welfare & Pension Cell'
      };
    default:
      return {
        authority: 'Municipal Corporation of Greater Mumbai',
        deptName: 'General Administrative Division'
      };
  }
};

export const getNodalOfficerForJurisdiction = (ward: string, dept: DepartmentType): string => {
  const cleanWard = ward.split(' - ')[0] || ward;
  switch (dept) {
    case 'Roads & Infra':
      return `${cleanWard} Roads Nodal Officer (Er. Rajesh Sharma)`;
    case 'Water Supply':
      return `${cleanWard} Executive Engineer (Er. Vikram Desai)`;
    case 'Sanitation & Waste':
      return `${cleanWard} Chief Sanitation Inspector (Shri Suresh Patil)`;
    case 'Electricity':
      return `${cleanWard} Assistant Electrical Engineer (Er. Amit Verma)`;
    case 'Public Health & Healthcare':
      return `${cleanWard} Medical Health Officer (Dr. Ananya Sen)`;
    case 'Public Distribution':
      return `${cleanWard} Rationing Inspector (Smt. Meena Joshi)`;
    default:
      return `${cleanWard} Ward Nodal Officer`;
  }
};
