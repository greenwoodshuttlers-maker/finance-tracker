import { theme } from "../../styles/theme";

export default function Input({label,...props}){
  return(
    <div style={{marginBottom:14}}>
      <label style={{color:theme.colors.sub}}>
        {label}
      </label>

      <input
        {...props}
        style={{
          width:"100%",
          padding:14,
          borderRadius:12,
          border:`1px solid ${theme.colors.border}`,
          background:"#020617",
          color:theme.colors.text,
          marginTop:6
        }}
      />
    </div>
  );
}
