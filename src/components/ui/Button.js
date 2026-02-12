import { theme } from "../../styles/theme";

export default function Button({children,...props}){
return(
<button
 {...props}
 style={{
  width:"100%",
  padding:16,
  borderRadius:14,
  border:"none",
  background:theme.colors.primary,
  color:"#fff",
  fontWeight:"600"
 }}
>
 {children}
</button>
);
}
