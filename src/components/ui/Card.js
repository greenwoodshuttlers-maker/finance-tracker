import { theme } from "../../styles/theme";

export default function Card({children}){
  return(
    <div style={{
      background:theme.colors.card,
      padding:theme.padding,
      borderRadius:theme.radius,
      marginBottom:16
    }}>
      {children}
    </div>
  );
}
