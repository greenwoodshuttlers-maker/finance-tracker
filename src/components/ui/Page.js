import { theme } from "../../styles/theme";

export default function Page({children}){

return(
<div style={{
  maxWidth:520,
  margin:"auto",
  padding:16,
}}>

<div style={{
  background:theme.colors.card,
  borderRadius:theme.radius,
  padding:18,
  boxShadow:theme.shadow
}}>
  {children}
</div>

</div>
);
}
